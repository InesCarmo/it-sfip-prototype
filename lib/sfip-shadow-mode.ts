import type { Mission } from "@/lib/sfip-types";

export const SFIP_SHADOW_KEY = "it-sfip:shadow-mode:v1";
const MAX_EVENTS = 800;

export type ShadowEventKind =
  | "mission_enter"
  | "mission_exit"
  | "search"
  | "filter_change"
  | "opportunity_open"
  | "shortlist_add"
  | "shortlist_remove"
  | "recommendation_accept"
  | "recommendation_reject"
  | "workspace_analyze"
  | "workspace_abandon";

export type ShadowEvent = {
  id: string;
  at: string;
  mission: Mission;
  kind: ShadowEventKind;
  label?: string;
  value?: string;
  results?: number;
  durationMs?: number;
};

export type ShadowMissionMetric = {
  mission: Mission;
  totalMs: number;
  visits: number;
  clicks: number;
  searches: number;
  filterChanges: number;
};

export type ShadowState = {
  version: 1;
  savedAt: string;
  events: ShadowEvent[];
};

export type ShadowFriction = {
  zeroResultSearches: number;
  repeatedSearches: number;
  successiveFilterChanges: number;
  abandonedWorkspaces: number;
  unusedShortlists: number;
};

export type ShadowInsights = {
  totalEvents: number;
  missionMetrics: ShadowMissionMetric[];
  topTasks: Array<{ label: string; count: number }>;
  blockers: Array<{ label: string; count: number; detail: string }>;
  littleUsed: Array<{ label: string; count: number }>;
  suggestions: string[];
  friction: ShadowFriction;
  lastUpdatedAt: string | null;
};

export type ShadowStorage = Pick<Storage, "getItem" | "setItem">;

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `shadow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampEvents(events: ShadowEvent[]) {
  return events.length > MAX_EVENTS ? events.slice(events.length - MAX_EVENTS) : events;
}

export function loadShadowState(storage: Pick<Storage, "getItem">): ShadowState | null {
  const serialized = storage.getItem(SFIP_SHADOW_KEY);
  if (!serialized) return null;
  try {
    const parsed = JSON.parse(serialized) as ShadowState;
    if (parsed.version !== 1 || !Array.isArray(parsed.events)) return null;
    return { ...parsed, events: clampEvents(parsed.events) };
  } catch {
    return null;
  }
}

export function saveShadowState(storage: ShadowStorage, state: Omit<ShadowState, "version" | "savedAt">) {
  const snapshot: ShadowState = {
    version: 1,
    savedAt: new Date().toISOString(),
    events: clampEvents(state.events),
  };
  storage.setItem(SFIP_SHADOW_KEY, JSON.stringify(snapshot));
  return snapshot;
}

export function appendShadowEvent(
  storage: ShadowStorage,
  event: Omit<ShadowEvent, "id" | "at"> & { at?: string },
) {
  const current = loadShadowState(storage) ?? { version: 1 as const, savedAt: new Date().toISOString(), events: [] as ShadowEvent[] };
  const next: ShadowEvent = {
    id: uid(),
    at: event.at ?? new Date().toISOString(),
    mission: event.mission,
    kind: event.kind,
    label: event.label,
    value: event.value,
    results: event.results,
    durationMs: event.durationMs,
  };
  return saveShadowState(storage, { events: [...current.events, next] });
}

export function buildShadowInsights(state: ShadowState | null): ShadowInsights {
  const events = state?.events ?? [];
  const byMission = new Map<Mission, ShadowMissionMetric>();
  const taskCounts = new Map<string, number>();
  const blockerCounts = new Map<string, { label: string; count: number; detail: string }>();
  const littleUsedCounts = new Map<string, number>();
  const searchHistory: Array<{ mission: Mission; label: string; results: number }> = [];
  let currentWorkspaceSearches = 0;
  let currentWorkspaceShortlistAdds = 0;
  let currentWorkspaceRecommendations = 0;

  const getMetric = (mission: Mission) => {
    const existing = byMission.get(mission);
    if (existing) return existing;
    const created: ShadowMissionMetric = { mission, totalMs: 0, visits: 0, clicks: 0, searches: 0, filterChanges: 0 };
    byMission.set(mission, created);
    return created;
  };

  const bumpTask = (label: string, amount = 1) => {
    taskCounts.set(label, (taskCounts.get(label) ?? 0) + amount);
  };

  const bumpBlocker = (key: string, label: string, detail: string, amount = 1) => {
    const current = blockerCounts.get(key) ?? { label, count: 0, detail };
    current.count += amount;
    blockerCounts.set(key, current);
  };

  for (const event of events) {
    const metric = getMetric(event.mission);
    if (event.kind === "mission_enter") metric.visits += 1;
    if (event.kind === "mission_exit" && typeof event.durationMs === "number") metric.totalMs += event.durationMs;
    if (event.kind === "search") {
      metric.searches += 1;
      metric.clicks += 1;
      bumpTask("Pesquisas efetuadas");
      searchHistory.push({ mission: event.mission, label: event.label ?? event.value ?? "", results: event.results ?? 0 });
      if ((event.results ?? 0) === 0) {
        bumpBlocker("zero-result", "Pesquisas sem resultados", `A pesquisa "${event.label ?? event.value ?? "sem termo"}" devolveu zero resultados.`);
      }
      currentWorkspaceSearches += 1;
    }
    if (event.kind === "filter_change") {
      metric.filterChanges += 1;
      metric.clicks += 1;
      bumpTask("Filtros utilizados");
    }
    if (event.kind === "opportunity_open") {
      metric.clicks += 1;
      bumpTask("Oportunidades abertas");
    }
    if (event.kind === "shortlist_add") {
      metric.clicks += 1;
      bumpTask("Shortlist");
      currentWorkspaceShortlistAdds += 1;
    }
    if (event.kind === "shortlist_remove") {
      metric.clicks += 1;
      bumpTask("Shortlist");
    }
    if (event.kind === "recommendation_accept") {
      metric.clicks += 1;
      currentWorkspaceRecommendations += 1;
      bumpTask("Recomendações aceites");
    }
    if (event.kind === "recommendation_reject") {
      metric.clicks += 1;
      bumpTask("Recomendações rejeitadas");
    }
    if (event.kind === "workspace_analyze") {
      metric.clicks += 1;
      bumpTask("Workspaces analisados");
      currentWorkspaceSearches = 0;
      currentWorkspaceShortlistAdds = 0;
      currentWorkspaceRecommendations = 0;
    }
  }

  for (let i = 1; i < searchHistory.length; i += 1) {
    const current = searchHistory[i];
    const previous = searchHistory[i - 1];
    if (current.mission === previous.mission && current.label.trim().toLowerCase() === previous.label.trim().toLowerCase()) {
      bumpBlocker("repeated-search", "Pesquisas repetidas", `A pesquisa "${current.label}" foi repetida na missão ${current.mission}.`);
    }
  }

  const filterChanges = events.filter((event) => event.kind === "filter_change");
  if (filterChanges.length >= 4) {
    const lastMission = filterChanges.at(-1)?.mission ?? "home";
    bumpBlocker("filter-churn", "Filtros sucessivamente alterados", `Foram registadas ${filterChanges.length} alterações de filtro no modo ${lastMission}.`);
  }

  const abandonSignals = events.filter((event) => event.kind === "workspace_abandon");
  if (abandonSignals.length || (currentWorkspaceSearches > 0 && currentWorkspaceShortlistAdds === 0 && currentWorkspaceRecommendations === 0)) {
    bumpBlocker("workspace-abandon", "Workspaces abandonados", "Existe pelo menos um Workspace iniciado sem shortlist ou decisão associada.");
  }

  const shortlistAdded = events.filter((event) => event.kind === "shortlist_add").length;
  const shortlistTouched = events.filter((event) => event.kind === "shortlist_add" || event.kind === "shortlist_remove").length;
  if (shortlistAdded > 0 && shortlistTouched === shortlistAdded) {
    bumpBlocker("unused-shortlist", "Shortlists nunca utilizadas", "Há shortlists criadas sem evidência de utilização posterior.");
  }

  const missionMetrics = [...byMission.values()].sort((a, b) => b.totalMs - a.totalMs || b.clicks - a.clicks);
  const taskList = [...taskCounts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  const blockers = [...blockerCounts.values()].sort((a, b) => b.count - a.count);

  for (const metric of missionMetrics) {
    if (metric.visits <= 1) littleUsedCounts.set(metric.mission, metric.visits);
  }
  const littleUsed = [...littleUsedCounts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => a.count - b.count);

  const suggestions: string[] = [];
  if (blockers.some((item) => item.label === "Pesquisas sem resultados")) suggestions.push("Melhorar sugestões automáticas para pesquisas vazias e termos genéricos.");
  if (blockers.some((item) => item.label === "Pesquisas repetidas")) suggestions.push("Mostrar resultados recentes e evitar repetir a mesma pesquisa sem novos filtros.");
  if (blockers.some((item) => item.label === "Filtros sucessivamente alterados")) suggestions.push("Compactar filtros e guardar combinações usadas com frequência.");
  if (blockers.some((item) => item.label === "Workspaces abandonados")) suggestions.push("Sugerir próximos passos quando um Workspace fica sem shortlist ou decisão.");
  if (blockers.some((item) => item.label === "Shortlists nunca utilizadas")) suggestions.push("Destacar shortlists inativas e pedir validação final antes de arquivar.");
  if (!suggestions.length) suggestions.push("Os padrões de utilização estão estáveis. Manter observação contínua.");

  return {
    totalEvents: events.length,
    missionMetrics,
    topTasks: taskList.slice(0, 5),
    blockers: blockers.map((item) => item),
    littleUsed: littleUsed.slice(0, 5),
    suggestions,
    friction: {
      zeroResultSearches: blockerCounts.get("zero-result")?.count ?? 0,
      repeatedSearches: blockerCounts.get("repeated-search")?.count ?? 0,
      successiveFilterChanges: blockerCounts.get("filter-churn")?.count ?? 0,
      abandonedWorkspaces: blockerCounts.get("workspace-abandon")?.count ?? 0,
      unusedShortlists: blockerCounts.get("unused-shortlist")?.count ?? 0,
    },
    lastUpdatedAt: state?.savedAt ?? null,
  };
}
