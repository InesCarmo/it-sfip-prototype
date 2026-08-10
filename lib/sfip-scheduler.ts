import manifest from "@/data/source_manifest.json";
import canonicalModel from "@/data/sfip-canonical-model.json";
import { coreEngine, type Opportunity } from "@/lib/core-engine";
import { buildWeeklyBriefing, createAutonomousSnapshot, type AutonomousSnapshot, type WeeklyBriefing } from "@/lib/sfip-autonomy";
import type { CallOfficialData, CompanyItem, EventItem, InstitutionItem, RadarItem, SfipDataModel } from "@/lib/sfip-data-model";
import type { PipelineDashboardState, PipelineSourceHistory, PipelineSourceState, StoredSchedulerState } from "@/lib/sfip-scheduler-store";

type ManifestSource = {
  source_id: string;
  name: string;
  category: string;
  execution_frequency?: string;
  priority?: string;
  human_approval_required?: string;
  acquisition_method?: string;
  destination?: string[];
};

type ManifestData = {
  sources: ManifestSource[];
};

const schedulerManifest = manifest as ManifestData;
const canonicalData = canonicalModel as SfipDataModel;

const SOURCE_KEY = "it-sfip:pipeline-scheduler:v1";

export type SchedulerExecution = {
  didRun: boolean;
  state: StoredSchedulerState;
  dashboard: PipelineDashboardState;
  briefing: WeeklyBriefing;
  processedSources: PipelineSourceHistory[];
  dueSources: string[];
  history: PipelineSourceHistory[];
  latestSnapshot: AutonomousSnapshot;
};

type SourceBucket = {
  calls: CallOfficialData[];
  radar: RadarItem[];
  events: EventItem[];
  companies: CompanyItem[];
  institutions: InstitutionItem[];
};

const FREQ_TO_MINUTES = new Map([
  ["diaria", 24 * 60],
  ["daily", 24 * 60],
  ["semanal", 7 * 24 * 60],
  ["weekly", 7 * 24 * 60],
  ["mensal", 30 * 24 * 60],
  ["monthly", 30 * 24 * 60],
  ["quinzenal", 14 * 24 * 60],
  ["fortnightly", 14 * 24 * 60],
  ["on-demand", 0],
]);

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function toISO(value: Date) {
  return value.toISOString();
}

function cadenceMinutes(freq?: string) {
  const lowered = normalize(freq);
  if (!lowered) return 24 * 60;
  const known = [...FREQ_TO_MINUTES.entries()].find(([key]) => lowered.includes(key));
  return known?.[1] ?? 24 * 60;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000);
}

function sourceBuckets(): Record<string, SourceBucket> {
  const bucket: Record<string, SourceBucket> = {};
  for (const source of schedulerManifest.sources) {
    bucket[source.source_id] = { calls: [], radar: [], events: [], companies: [], institutions: [] };
  }

  for (const item of canonicalData.calls) {
    const sourceId = item.sourceId;
    if (!bucket[sourceId]) continue;
    bucket[sourceId].calls.push(item);
  }
  for (const item of canonicalData.radar) {
    const sourceId = item.sourceId;
    if (!bucket[sourceId]) continue;
    bucket[sourceId].radar.push(item);
  }
  for (const item of canonicalData.events) {
    const sourceId = item.sourceId;
    if (!bucket[sourceId]) continue;
    bucket[sourceId].events.push(item);
  }
  for (const item of canonicalData.companies) {
    const sourceId = (item as CompanyItem & { sourceId?: string }).sourceId;
    if (!sourceId || !bucket[sourceId]) continue;
    bucket[sourceId].companies.push(item);
  }
  for (const item of canonicalData.institutions) {
    const sourceId = (item as InstitutionItem & { sourceId?: string }).sourceId;
    if (!sourceId || !bucket[sourceId]) continue;
    bucket[sourceId].institutions.push(item);
  }
  return bucket;
}

function digestForSource(sourceId: string, bucket: SourceBucket) {
  const sourceItems = [
    ...bucket.calls.map((item) => `call:${item.id}:${item.status}:${item.dates.deadlineAt ?? ""}`),
    ...bucket.radar.map((item) => `radar:${item.id}:${item.status}:${item.deadlineForecastAt ?? ""}`),
    ...bucket.events.map((item) => `event:${item.id}:${item.type}:${item.registrationDeadlineAt ?? ""}`),
    ...bucket.companies.map((item) => `company:${item.id}:${item.name}`),
    ...bucket.institutions.map((item) => `institution:${item.id}:${item.name}`),
  ];
  return `${sourceId}|${sourceItems.length}|${sourceItems.sort().join("~")}`;
}

function validationCount(bucket: SourceBucket) {
  const requiredComplete = bucket.calls.filter((item) => item.officialTitle && item.officialCode && item.links.official && item.dates.deadlineAt).length;
  const radarReady = bucket.radar.filter((item) => item.title && item.officialUrl).length;
  const eventsReady = bucket.events.filter((item) => item.title && item.officialUrl).length;
  return requiredComplete + radarReady + eventsReady;
}

function enrichmentCount(bucket: SourceBucket) {
  return bucket.calls.filter((item) => item.areaPrimary || item.thematicKeywords.length || item.targetGroups.length).length + bucket.radar.length + bucket.events.length;
}

function publicationCount(bucket: SourceBucket) {
  return bucket.calls.filter((item) => item.status === "open" || item.status === "planned").length + bucket.radar.length + bucket.events.length;
}

function changesBetween(previousDigest: string | undefined, nextDigest: string) {
  if (!previousDigest) return ["Initial discovery snapshot captured."];
  if (previousDigest === nextDigest) return [];
  return ["Source content changed since last execution."];
}

function sourceStatus(lastRunAt: string | null, nextRunAt: string | null, now: Date) {
  if (!lastRunAt) return "due" as const;
  if (nextRunAt && new Date(nextRunAt).getTime() <= now.getTime()) return "due" as const;
  return "ok" as const;
}

function emptyDashboard(): PipelineDashboardState {
  return {
    totalSources: schedulerManifest.sources.length,
    dueSources: 0,
    activeSources: 0,
    errorSources: 0,
    healthySources: 0,
    totalChanges: 0,
    lastRunAt: null,
    latestBriefingAt: null,
    latestSnapshotAt: null,
    newCalls: 0,
    updatedCalls: 0,
    closedCalls: 0,
    removedCalls: 0,
    newWebinars: 0,
    newBrokerageEvents: 0,
  };
}

function baseSourceState(source: ManifestSource): PipelineSourceState {
  return {
    sourceId: source.source_id,
    sourceName: source.name,
    category: source.category,
    frequency: source.execution_frequency ?? "Daily",
    priority: source.priority ?? "high",
    humanApprovalRequired: normalize(source.human_approval_required) !== "not_required",
    lastRunAt: null,
    nextRunAt: null,
    lastStatus: "idle",
    lastDurationMs: 0,
    lastChangeCount: 0,
    lastErrorCount: 0,
    lastDigest: "",
  };
}

function scheduleSource(source: ManifestSource, current: PipelineSourceState | undefined, now: Date, bucket: SourceBucket) {
  const nextState = current ?? baseSourceState(source);
  const due = sourceStatus(current?.lastRunAt ?? null, current?.nextRunAt ?? null, now) === "due";
  const discoveryCount = bucket.calls.length + bucket.radar.length + bucket.events.length + bucket.companies.length + bucket.institutions.length;
  const validationCountValue = validationCount(bucket);
  const enrichmentCountValue = enrichmentCount(bucket);
  const publicationCountValue = publicationCount(bucket);
  const digest = digestForSource(source.source_id, bucket);
  const changes = changesBetween(current?.lastDigest, digest);
  const errors: string[] = [];
  if (!discoveryCount) errors.push("No records found for source.");
  if (bucket.calls.some((item) => item.status === "open" && item.dates.deadlineAt && new Date(`${item.dates.deadlineAt}T23:59:59Z`).getTime() < now.getTime())) {
    errors.push("Open call with past deadline detected.");
  }
  if (bucket.calls.some((item) => !item.links.official)) errors.push("Missing official link in call payload.");
  if (bucket.events.some((item) => !item.officialUrl)) errors.push("Missing official URL in event payload.");
  const durationMs = Math.max(40, 20 + discoveryCount * 2 + validationCountValue + enrichmentCountValue / 2);
  const startedAt = toISO(new Date(now.getTime() - durationMs));
  const finishedAt = toISO(now);

    const history: PipelineSourceHistory = {
    sourceId: source.source_id,
    sourceName: source.name,
    category: source.category,
    frequency: source.execution_frequency ?? "Daily",
    scheduledAt: toISO(now),
    startedAt,
    finishedAt,
    durationMs,
    status: errors.length ? "error" : due ? "ok" : "skipped",
    discoveryCount,
    validationCount: validationCountValue,
    enrichmentCount: enrichmentCountValue,
    publicationCount: publicationCountValue,
    changeCount: changes.length,
    errorCount: errors.length,
    changes,
    errors,
  };

  const nextScheduleMinutes = cadenceMinutes(source.execution_frequency);
  return {
    state: {
      ...nextState,
      lastRunAt: toISO(now),
      nextRunAt: nextScheduleMinutes > 0 ? toISO(addMinutes(now, nextScheduleMinutes)) : null,
      lastStatus: errors.length ? "error" : "ok",
      lastDurationMs: durationMs,
      lastChangeCount: changes.length,
      lastErrorCount: errors.length,
      lastDigest: digest,
    } satisfies PipelineSourceState,
    history,
    due,
  };
}

export function loadSchedulerState(storage: Pick<Storage, "getItem">): StoredSchedulerState | null {
  const serialized = storage.getItem(SOURCE_KEY);
  if (!serialized) return null;
  try {
    const state = JSON.parse(serialized) as StoredSchedulerState;
    if (state.version !== 1 || !state.sourceStates || !Array.isArray(state.history)) return null;
    return state;
  } catch {
    return null;
  }
}

export function saveSchedulerState(storage: Pick<Storage, "setItem">, state: Omit<StoredSchedulerState, "version" | "savedAt">) {
  const snapshot: StoredSchedulerState = {
    ...state,
    version: 1,
    savedAt: new Date().toISOString(),
  };
  storage.setItem(SOURCE_KEY, JSON.stringify(snapshot));
  return snapshot;
}

export function runAutonomousScheduler(storage: Pick<Storage, "getItem" | "setItem">, options?: { now?: Date; force?: boolean }) {
  const now = options?.now ?? new Date();
  const current = loadSchedulerState(storage);
  const buckets = sourceBuckets();
  const nextSourceStates = { ...(current?.sourceStates ?? {}) } as Record<string, PipelineSourceState>;
  const nextHistory = [...(current?.history ?? [])];
  const processed: PipelineSourceHistory[] = [];
  const dueSources: string[] = [];

  for (const source of schedulerManifest.sources) {
    const bucket = buckets[source.source_id] ?? { calls: [], radar: [], events: [], companies: [], institutions: [] };
    const currentState = nextSourceStates[source.source_id];
    const due = options?.force || !currentState || sourceStatus(currentState.lastRunAt, currentState.nextRunAt, now) === "due";
    if (!due) {
      nextSourceStates[source.source_id] = currentState ?? baseSourceState(source);
      continue;
    }
    dueSources.push(source.source_id);
    const run = scheduleSource(source, currentState, now, bucket);
    nextSourceStates[source.source_id] = run.state;
    nextHistory.push(run.history);
    processed.push(run.history);
  }

  if (nextHistory.length > 120) nextHistory.splice(0, nextHistory.length - 120);

  const latestSnapshot = createAutonomousSnapshot();
  const latestBriefing = buildWeeklyBriefing(current?.latestSnapshot ?? null);
  const dashboard = buildPipelineDashboard(nextSourceStates, nextHistory, latestBriefing, latestSnapshot, processed);

  const nextState = saveSchedulerState(storage, {
    latestRunAt: processed.length ? now.toISOString() : current?.latestRunAt ?? null,
    latestSnapshotAt: latestSnapshot.savedAt,
    latestBriefingAt: latestBriefing.generatedAt,
    sourceStates: nextSourceStates,
    history: nextHistory,
    latestSnapshot,
    latestBriefing,
    dashboard,
  });

  return {
    didRun: processed.length > 0,
    state: nextState,
    dashboard,
    briefing: latestBriefing,
    processedSources: processed,
    dueSources,
    history: nextHistory,
    latestSnapshot,
  } satisfies SchedulerExecution;
}

export function buildPipelineDashboard(
  sourceStates: Record<string, PipelineSourceState>,
  history: PipelineSourceHistory[],
  briefing: WeeklyBriefing,
  snapshot: AutonomousSnapshot,
  processed: PipelineSourceHistory[] = [],
): PipelineDashboardState {
  const values = Object.values(sourceStates);
  const activeSources = values.filter((item) => item.lastRunAt).length;
  const dueSources = values.filter((item) => !item.nextRunAt || new Date(item.nextRunAt).getTime() <= Date.now()).length;
  const errorSources = values.filter((item) => item.lastErrorCount > 0).length;
  const healthySources = values.filter((item) => item.lastStatus === "ok").length;
  const totalChanges = values.reduce((acc, item) => acc + item.lastChangeCount, 0);

  return {
    totalSources: values.length,
    dueSources,
    activeSources,
    errorSources,
    healthySources,
    totalChanges,
    lastRunAt: processed.at(-1)?.finishedAt ?? values.map((item) => item.lastRunAt ?? "").sort().at(-1) ?? null,
    latestBriefingAt: briefing.generatedAt,
    latestSnapshotAt: snapshot.savedAt,
    newCalls: briefing.summary.newCount,
    updatedCalls: briefing.summary.changedDeadlinesCount,
    closedCalls: briefing.summary.closedCount,
    removedCalls: briefing.summary.removedCount,
    newWebinars: briefing.summary.webinarCount,
    newBrokerageEvents: briefing.summary.brokerageCount,
  };
}

export function ensureScheduledPipeline(storage: Pick<Storage, "getItem" | "setItem">) {
  const state = loadSchedulerState(storage);
  if (!state) return runAutonomousScheduler(storage, { force: true });
  return runAutonomousScheduler(storage);
}
