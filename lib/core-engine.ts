import model from "@/data/sfip-canonical-model.json";
import { computeDaysRemaining, computeTemporalCallState } from "@/lib/sfip-temporal-state.js";
import type {
  CallIntelligence,
  CallOfficialData,
  CampaignItem,
  CompanyItem,
  EventItem,
  InstitutionItem,
  KnowledgeIndexEntry,
  RadarItem,
  ResearcherItem,
  SfipDataModel,
  WorkspaceIdea,
} from "@/lib/sfip-data-model";

type SearchableEntity = {
  id: string;
  source: "CALLS" | "RADAR";
  name: string;
  code: string;
  program: string;
  entity: string;
  area: string;
  secondaryArea: string;
  group: string;
  researcher: string;
  type: string;
  level: string;
  state: string;
  fit: string;
  deadline: string;
  deadlineIso: string | null;
  days: number | null;
  condition: string;
  why: string;
  keywords: string;
  observations: string;
  link: string;
  action: string;
  priority: string;
  companyRequired: string;
  partnerRequired: string;
  tone: "good" | "warn" | "neutral";
  raw: CallOfficialData | RadarItem;
};

export type Opportunity = SearchableEntity;
export type OpportunityFilters = {
  program?: string;
  area?: string;
  group?: string;
  researcher?: string;
  type?: string;
  state?: string;
  deadlineDays?: number;
  company?: string;
  source?: "CALLS" | "RADAR";
};

export type WorkspaceContext = {
  title: string;
  description: string;
  area?: string;
  group?: string;
  researcher?: string;
  company?: string;
  program?: string;
  deadlineDays?: number;
};

const data = model as SfipDataModel;
const calls = data.calls;
const radar = data.radar;
const researchers = data.researchers;
const knowledgeIndex = data.knowledgeIndex;
const callIntelligence = new Map(data.callIntelligence.map((item) => [item.callId, item]));
const callById = new Map(calls.map((item) => [item.id, item]));
const radarById = new Map(radar.map((item) => [item.id, item]));
const researcherById = new Map(researchers.map((item) => [item.id, item]));

const asText = (value: unknown) => value == null ? "" : String(value).trim();
const normalize = (value: unknown) => asText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const terms = (value: unknown) => normalize(value).match(/[a-z0-9]+/g) ?? [];
const values = (value: unknown) => asText(value).split(/[;,]/).map((item) => item.trim()).filter(Boolean);
const unique = (items: string[]) => [...new Set(items.filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt"));
const excelLabel = (iso: string | null) => iso ? new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)) : "Por confirmar";
function readResearchersFromCall(callId: string) {
  const intelligence = callIntelligence.get(callId);
  if (intelligence?.researchersSuggested?.length) {
    return intelligence.researchersSuggested.map((id) => researcherById.get(id)?.name).filter(Boolean) as string[];
  }
  const call = callById.get(callId);
  if (!call) return [];
  return unique(
    call.targetGroups.flatMap((group) =>
      researchers
        .filter((person) => normalize(person.keywords.join(" ") + " " + person.expertiseTags.join(" ") + " " + person.name).includes(normalize(group)))
        .map((person) => person.name),
    ),
  );
}

function tokenSetFor(text: string) {
  return new Set(terms(text));
}

function searchIndex(term: string) {
  const exact = normalize(term);
  if (!exact) return knowledgeIndex;
  const termTokens = new Set(terms(term));
  return knowledgeIndex.filter((entry) => {
    const tokens = new Set(entry.tokens);
    if (!termTokens.size) return false;
    return [...termTokens].every((token) => tokens.has(token) || entry.title.toLowerCase() === exact || entry.searchableText.toLowerCase().includes(` ${exact} `));
  });
}

function opportunityFromCall(call: CallOfficialData): Opportunity {
  const intelligence = callIntelligence.get(call.id);
  const deadlineIso = call.dates.deadlineAt ?? null;
  const days = intelligence?.daysRemaining ?? computeDaysRemaining(deadlineIso);
  const computedState = computeTemporalCallState({ openedAt: call.dates.openedAt ?? null, deadlineAt: deadlineIso });
  const fit = intelligence?.potentialIt || (days !== null ? (days <= 30 ? "Muito Alto" : days <= 90 ? "Alto" : "Médio") : "Por confirmar");
  const area = intelligence?.areaStrategicIt || call.areaPrimary || "Transversal";
  return {
    id: call.id,
    source: "CALLS",
    name: call.officialTitle,
    code: call.officialCode,
    program: data.programs.find((program) => program.id === call.programId)?.officialName ?? "Por confirmar",
    entity: call.entity.name,
    area,
    secondaryArea: call.areaSecondary ?? "",
    group: call.targetGroups.join("; "),
    researcher: readResearchersFromCall(call.id).join("; "),
    type: call.type,
    level: call.level,
    state: computedState,
    fit,
    deadline: deadlineIso ? excelLabel(deadlineIso) : "Por confirmar",
    deadlineIso,
    days,
    condition: call.eligibility.consortiumRequired ? "Sim" : "Não",
    why: intelligence?.explainWhy || call.notes || "",
    keywords: call.thematicKeywords.join("; "),
    observations: call.notes || "",
    link: call.links.official,
    action: intelligence?.communicationTags.includes("webinar") ? "Divulgar" : intelligence?.partnerNeeds.length ? "Contactar Investigador" : "Rever oportunidade",
    priority: days !== null && days <= 30 ? "1 - Estratégica" : computedState === "Prevista" ? "2 - Relevante" : "3 - Oportunidade",
    companyRequired: call.eligibility.companyRequired ? "Sim" : "Não",
    partnerRequired: call.eligibility.consortiumRequired ? "Sim" : "Não",
    tone: computedState === "Aberta" ? "good" : computedState === "Prevista" ? "warn" : "neutral",
    raw: call,
  };
}

function opportunityFromRadar(item: RadarItem): Opportunity {
  const deadlineIso = item.deadlineForecastAt ?? null;
  return {
    id: item.id,
    source: "RADAR",
    name: item.title,
    code: "",
    program: data.programs.find((program) => program.id === item.programId)?.officialName ?? "Por confirmar",
    entity: "",
    area: item.theme,
    secondaryArea: "",
    group: item.groupHints.join("; "),
    researcher: "",
    type: "Radar",
    level: "",
    state: "Radar",
    fit: item.confidence >= 85 ? "Muito Alto" : item.confidence >= 70 ? "Alto" : "Médio",
    deadline: deadlineIso ? excelLabel(deadlineIso) : "Por confirmar",
    deadlineIso,
    days: computeDaysRemaining(deadlineIso),
    condition: "Por confirmar",
    why: item.notes || "",
    keywords: item.theme,
    observations: item.notes || "",
    link: item.officialUrl || "",
    action: "Monitorizar",
    priority: item.confidence >= 85 ? "1 - Estratégica" : "2 - Relevante",
    companyRequired: "Por confirmar",
    partnerRequired: "Por confirmar",
    tone: "warn",
    raw: item,
  };
}

const callOpportunities = calls.map(opportunityFromCall);
const radarOpportunities = radar.map(opportunityFromRadar);
const allOpportunities = [...callOpportunities, ...radarOpportunities];

function searchable(item: Opportunity) {
  return [
    item.name,
    item.code,
    item.program,
    item.entity,
    item.type,
    item.level,
    item.area,
    item.secondaryArea,
    item.group,
    item.researcher,
    item.keywords,
    item.observations,
    item.why,
    item.state,
    item.companyRequired,
    item.partnerRequired,
  ].join(" ");
}

function matchesKnowledgeQuery(item: Opportunity, query: string) {
  const queryTokens = terms(query);
  if (!queryTokens.length) return true;
  const matchingEntries = searchIndex(query);
  if (!matchingEntries.length) return false;
  const allowedIds = new Set(matchingEntries.map((entry) => `${entry.entityType}:${entry.entityId}`));
  return allowedIds.has(`${item.source === "CALLS" ? "call" : "radar"}:${item.id}`) && queryTokens.every((token) => {
    const entry = matchingEntries.find((candidate) => `${candidate.entityType}:${candidate.entityId}` === `${item.source === "CALLS" ? "call" : "radar"}:${item.id}`);
    return entry ? entry.tokens.includes(token) : false;
  });
}

function includesValue(actual: string, expected?: string) {
  if (!expected || /^(todos|todas|qualquer)$/i.test(expected)) return true;
  return normalize(actual).includes(normalize(expected));
}

function filter(items: Opportunity[], filters: OpportunityFilters = {}) {
  return items.filter((item) =>
    includesValue(item.program, filters.program) &&
    includesValue(item.area, filters.area) &&
    includesValue(item.group, filters.group) &&
    includesValue(item.researcher, filters.researcher) &&
    includesValue(item.type, filters.type) &&
    includesValue(item.state, filters.state) &&
    includesValue(`${item.entity} ${item.observations} ${item.companyRequired}`, filters.company) &&
    (!filters.source || item.source === filters.source) &&
    (!filters.deadlineDays || (item.days !== null && item.days >= 0 && item.days <= filters.deadlineDays)),
  );
}

function contextualScore(item: Opportunity, context: WorkspaceContext) {
  const contextTokens = tokenSetFor(`${context.title} ${context.description} ${context.area ?? ""} ${context.group ?? ""} ${context.company ?? ""}`);
  const documentTokens = tokenSetFor(searchable(item));
  let score = [...contextTokens].filter((token) => token.length > 2 && documentTokens.has(token)).length * 6;
  if (context.group && includesValue(item.group, context.group)) score += 28;
  if (context.area && includesValue(item.area, context.area)) score += 24;
  if (context.program && includesValue(item.program, context.program)) score += 18;
  if (context.researcher && includesValue(item.researcher, context.researcher)) score += 18;
  if (context.company && includesValue(`${item.entity} ${item.observations}`, context.company)) score += 12;
  if (item.state === "Aberta") score += 8;
  if (item.state === "Prevista" || item.source === "RADAR") score += 3;
  if (context.deadlineDays && item.days !== null && item.days > context.deadlineDays) score -= 12;
  return Math.max(0, score);
}

export const coreEngine = {
  meta: {
    sourceWorkbook: "SFIP Canonical Model",
    generatedAt: new Date().toISOString(),
    counts: {
      calls: calls.length,
      researchers: researchers.length,
      matching: data.callIntelligence.length,
      legacyMatching: 0,
      radar: radar.length,
    },
  },
  getAllOpportunities: (includeRadar = false) => includeRadar ? allOpportunities : callOpportunities,
  getOpportunity: (id: string) => allOpportunities.find((item) => item.id === id) ?? null,
  searchGlobal: (query: string, filters: OpportunityFilters = {}) => filter(allOpportunities.filter((item) => matchesKnowledgeQuery(item, query)), filters),
  filterOpportunities: (filters: OpportunityFilters = {}) => filter(callOpportunities, filters),
  getByGroup: (group: string) => filter(allOpportunities, { group }),
  getByProgram: (program: string) => filter(allOpportunities, { program }),
  getByCompany: (company: string) => filter(allOpportunities, { company }),
  getByInvestigator: (researcher: string) => filter(allOpportunities, { researcher }),
  getByDeadline: (deadlineDays: number) => filter(allOpportunities, { deadlineDays }),
  getContextualRecommendations: (context: WorkspaceContext, limit = 8) => allOpportunities
    .map((item) => ({ item, score: contextualScore(item, context) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || (a.item.days ?? 99999) - (b.item.days ?? 99999))
    .slice(0, limit),
  selectForCommunication: (filters: OpportunityFilters = {}) => filter(allOpportunities, filters).filter((item) => item.state === "Aberta" || item.state === "Prevista" || item.source === "RADAR"),
  getResearchersForCall: (callId: string) => readResearchersFromCall(callId),
  getResearchers: () => researchers,
  getCompanies: () => data.companies,
  getInstitutions: () => data.institutions,
  getPrograms: () => data.programs,
  getEvents: () => data.events,
  getProgramName: (programId: string) => data.programs.find((program) => program.id === programId)?.officialName ?? "Por confirmar",
  getActions: () => callOpportunities
    .filter((item) => item.action && !/não aplic[aá]vel/i.test(item.action))
    .map((item) => ({
      id: item.id,
      label: item.action,
      call: item.name,
      due: item.deadline,
      days: item.days,
      done: false,
    })),
  facets: {
    programs: unique(allOpportunities.map((item) => item.program)),
    areas: unique(allOpportunities.map((item) => item.area)),
    groups: unique(allOpportunities.flatMap((item) => values(item.group))),
    researchers: unique(researchers.map((item) => item.name)),
    companies: unique(callOpportunities.map((item) => item.entity)),
    types: unique(allOpportunities.map((item) => item.type)),
    states: unique(allOpportunities.map((item) => item.state)),
  },
  answerAssistant(question: string, context: WorkspaceContext) {
    const recommendations = this.getContextualRecommendations(context, 3);
    if (!recommendations.length) return "Não encontrei oportunidades com evidência suficiente para este Workspace. Reveja a área, grupo ou descrição.";
    const q = normalize(question);
    if (q.includes("parceir") || q.includes("consorcio")) return recommendations.map(({ item }) => `${item.name}: ${item.partnerRequired || item.condition || "condição não especificada"}`).join("\n");
    if (q.includes("investig")) return unique(recommendations.flatMap(({ item }) => readResearchersFromCall(item.id))).slice(0, 5).join("; ") || "Sem investigadores validados no matching.";
    return `Melhor correspondência: ${recommendations[0].item.name} (${recommendations[0].score} pontos contextuais). ${recommendations[0].item.why}`;
  },
};

export type CoreEngine = typeof coreEngine;



