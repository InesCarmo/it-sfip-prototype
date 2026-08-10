import type { StorageAdapter } from "@/lib/sfip-state-store";
import type { AutonomousSnapshot, WeeklyBriefing } from "@/lib/sfip-autonomy";

export const SFIP_SCHEDULER_KEY = "it-sfip:scheduler-state:v1";

export type PipelineSourceStatus = "idle" | "due" | "running" | "ok" | "skipped" | "error";

export type PipelineSourceHistory = {
  sourceId: string;
  sourceName: string;
  category: string;
  frequency: string;
  scheduledAt: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: PipelineSourceStatus;
  discoveryCount: number;
  validationCount: number;
  enrichmentCount: number;
  publicationCount: number;
  changeCount: number;
  errorCount: number;
  changes: string[];
  errors: string[];
};

export type PipelineSourceState = {
  sourceId: string;
  sourceName: string;
  category: string;
  frequency: string;
  priority: string;
  humanApprovalRequired: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastStatus: PipelineSourceStatus;
  lastDurationMs: number;
  lastChangeCount: number;
  lastErrorCount: number;
  lastDigest: string;
};

export type PipelineDashboardState = {
  totalSources: number;
  dueSources: number;
  activeSources: number;
  errorSources: number;
  healthySources: number;
  totalChanges: number;
  lastRunAt: string | null;
  latestBriefingAt: string | null;
  latestSnapshotAt: string | null;
  newCalls: number;
  updatedCalls: number;
  closedCalls: number;
  removedCalls: number;
  newWebinars: number;
  newBrokerageEvents: number;
};

export type StoredSchedulerState = {
  version: 1;
  savedAt: string;
  latestRunAt: string | null;
  latestSnapshotAt: string | null;
  latestBriefingAt: string | null;
  sourceStates: Record<string, PipelineSourceState>;
  history: PipelineSourceHistory[];
  latestSnapshot: AutonomousSnapshot | null;
  latestBriefing: WeeklyBriefing | null;
  dashboard: PipelineDashboardState;
};

export type SchedulerRunResult = {
  didRun: boolean;
  state: StoredSchedulerState;
};

export function loadSchedulerState(storage: StorageAdapter): StoredSchedulerState | null {
  const serialized = storage.getItem(SFIP_SCHEDULER_KEY);
  if (!serialized) return null;
  try {
    const state = JSON.parse(serialized) as StoredSchedulerState;
    if (state.version !== 1 || !state.sourceStates || !Array.isArray(state.history)) return null;
    return state;
  } catch {
    return null;
  }
}

export function saveSchedulerState(storage: StorageAdapter, state: Omit<StoredSchedulerState, "version" | "savedAt">) {
  const snapshot: StoredSchedulerState = {
    ...state,
    version: 1,
    savedAt: new Date().toISOString(),
  };
  storage.setItem(SFIP_SCHEDULER_KEY, JSON.stringify(snapshot));
  return snapshot;
}

export function clearSchedulerState(storage: StorageAdapter) {
  storage.removeItem(SFIP_SCHEDULER_KEY);
}
