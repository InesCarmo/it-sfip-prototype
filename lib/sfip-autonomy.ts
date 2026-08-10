import { coreEngine, type Opportunity } from "@/lib/core-engine";

export type WeeklyBriefing = {
  generatedAt: string;
  since: string | null;
  newOpportunities: Opportunity[];
  changedDeadlines: Array<{ opportunity: Opportunity; before: string; after: string }>;
  closedOpportunities: Opportunity[];
  removedOpportunities: Opportunity[];
  webinars: Opportunity[];
  brokerageEvents: Opportunity[];
  radarHighlights: Opportunity[];
  syncErrors: string[];
  groupHighlights: Array<{ group: string; count: number }>;
  summary: {
    newCount: number;
    changedDeadlinesCount: number;
    webinarCount: number;
    brokerageCount: number;
    closedCount: number;
    removedCount: number;
    syncErrorCount: number;
  };
};

export type AutonomousSnapshot = {
  version: 1;
  savedAt: string;
  opportunityIds: string[];
  deadlineById: Record<string, string>;
  stateById: Record<string, string>;
  eventSignature: string[];
};

export const SFIP_AUTONOMY_KEY = "it-sfip:autonomous-briefing:v1";

function asText(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function isWebinarOpportunity(item: Opportunity) {
  return /webinar/i.test(`${item.type} ${item.name} ${item.observations} ${item.why}`);
}

function isBrokerageOpportunity(item: Opportunity) {
  return /brokerage/i.test(`${item.type} ${item.name} ${item.observations} ${item.why}`);
}

function buildSnapshot(): AutonomousSnapshot {
  const opportunities = coreEngine.getAllOpportunities(true);
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    opportunityIds: opportunities.map((item) => item.id),
    deadlineById: Object.fromEntries(opportunities.filter((item) => asText(item.deadline)).map((item) => [item.id, item.deadline])),
    stateById: Object.fromEntries(opportunities.map((item) => [item.id, item.state])),
    eventSignature: coreEngine.getEvents().map((event) => `${event.title}|${event.type}|${event.officialUrl}`),
  };
}

function eventToOpportunity(event: ReturnType<typeof coreEngine.getEvents>[number]): Opportunity {
  return {
    id: event.id,
    source: "CALLS",
    name: event.title,
    code: "",
    program: event.programId ? coreEngine.getProgramName(event.programId) : "Por confirmar",
    entity: "",
    area: event.type === "webinar" ? "Transversal" : "Transversal",
    secondaryArea: "",
    group: event.audience.join("; "),
    researcher: "",
    type: event.type,
    level: "",
    state: "Aberta",
    fit: "Por confirmar",
    deadline: event.registrationDeadlineAt ?? "Por confirmar",
    deadlineIso: event.registrationDeadlineAt ?? null,
    days: null,
    condition: "Por confirmar",
    why: event.notes ?? "",
    keywords: event.title,
    observations: event.notes ?? "",
    link: event.officialUrl,
    action: "Divulgar",
    priority: "2 - Relevante",
    companyRequired: "Por confirmar",
    partnerRequired: "Por confirmar",
    tone: "neutral",
    raw: event,
  };
}

export function loadAutonomousSnapshot(storage: Pick<Storage, "getItem">): AutonomousSnapshot | null {
  const serialized = storage.getItem(SFIP_AUTONOMY_KEY);
  if (!serialized) return null;
  try {
    const snapshot = JSON.parse(serialized) as AutonomousSnapshot;
    if (snapshot.version !== 1 || !Array.isArray(snapshot.opportunityIds) || !snapshot.deadlineById || !snapshot.stateById || !Array.isArray(snapshot.eventSignature)) return null;
    return snapshot;
  } catch {
    return null;
  }
}

export function saveAutonomousSnapshot(storage: Pick<Storage, "setItem">, snapshot: AutonomousSnapshot) {
  storage.setItem(SFIP_AUTONOMY_KEY, JSON.stringify(snapshot));
}

export function buildWeeklyBriefing(previous?: AutonomousSnapshot | null): WeeklyBriefing {
  const current = buildSnapshot();
  const opportunities = coreEngine.getAllOpportunities(true);
  const previousIds = new Set(previous?.opportunityIds ?? []);

  const newOpportunities = opportunities.filter((item) => !previousIds.has(item.id));
  const removedOpportunities = (previous?.opportunityIds ?? [])
    .filter((id) => !opportunities.some((item) => item.id === id))
    .map((id) => coreEngine.getOpportunity(id))
    .filter((item): item is Opportunity => Boolean(item));
  const changedDeadlines = opportunities
    .filter((item) => previous?.deadlineById?.[item.id] && previous.deadlineById[item.id] !== item.deadline)
    .map((item) => ({
      opportunity: item,
      before: previous?.deadlineById?.[item.id] ?? "",
      after: item.deadline,
    }));
  const closedOpportunities = opportunities.filter((item) => item.state === "Encerrada" && (previous ? previous.stateById[item.id] !== "Encerrada" : true));
  const webinars = coreEngine.getEvents().filter((event) => event.type === "webinar").map(eventToOpportunity);
  const brokerageEvents = coreEngine.getEvents().filter((event) => event.type === "brokerage").map(eventToOpportunity);
  const radarHighlights = coreEngine.getAllOpportunities(true).filter((item) => item.source === "RADAR").slice(0, 5);
  const syncErrors = [
    ...opportunities.filter((item) => item.state === "Aberta" && (item.days ?? 9999) < 0).map((item) => `${item.id}: deadline vencida em estado aberto`),
    ...opportunities.filter((item) => !item.deadline || item.deadline === "Por confirmar").map((item) => `${item.id}: deadline em falta`),
    ...opportunities.filter((item) => !item.link).map((item) => `${item.id}: link oficial em falta`),
  ];
  const groupHighlights = coreEngine.facets.groups
    .map((group) => ({ group, count: coreEngine.getByGroup(group).filter((item) => item.state === "Aberta").length }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
      generatedAt: current.savedAt,
      since: previous?.savedAt ?? null,
      newOpportunities,
      changedDeadlines,
      closedOpportunities,
      removedOpportunities,
      webinars,
      brokerageEvents,
      radarHighlights,
      syncErrors,
      groupHighlights,
      summary: {
        newCount: newOpportunities.length,
        changedDeadlinesCount: changedDeadlines.length,
        webinarCount: webinars.length,
        brokerageCount: brokerageEvents.length,
        closedCount: closedOpportunities.length,
        removedCount: removedOpportunities.length,
        syncErrorCount: syncErrors.length,
      },
    };
}

export function createAutonomousSnapshot() {
  return buildSnapshot();
}
