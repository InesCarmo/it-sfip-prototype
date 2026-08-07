import source from "@/data/core-data.json";

type Row = Record<string, string | number | boolean | null>;
export type SourceKind = "CALLS" | "RADAR";

export type Opportunity = {
  id: string;
  source: SourceKind;
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
  raw: Row;
};

export type OpportunityFilters = {
  program?: string;
  area?: string;
  group?: string;
  researcher?: string;
  type?: string;
  state?: string;
  deadlineDays?: number;
  company?: string;
  source?: SourceKind;
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

const calls = source.calls as Row[];
const radar = source.radar as Row[];
const researchers = source.researchers as Row[];
const matching = source.matching as Row[];
const legacyMatching = source.legacyMatching as Row[];

const asText = (value: unknown) => value == null ? "" : String(value).trim();
const normalize = (value: unknown) => asText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const terms = (value: unknown) => normalize(value).match(/[a-z0-9]+/g) ?? [];
const values = (value: unknown) => asText(value).split(/[;,]/).map(item => item.trim()).filter(Boolean);
const unique = (items: string[]) => [...new Set(items.filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt"));
const excelLabel = (iso: string | null) => iso ? new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)) : "Por confirmar";
const daysUntil = (iso: string | null) => iso ? Math.ceil((new Date(`${iso}T23:59:59Z`).getTime() - Date.now()) / 86400000) : null;

function researchersForCall(callId: string) {
  const calibrated = matching.filter(item => asText(item["Call ID"]) === callId).sort((a, b) => Number(b["Score Total"] ?? 0) - Number(a["Score Total"] ?? 0));
  if (calibrated.length) return calibrated.map(item => asText(item.Investigador));
  const legacy = legacyMatching.find(item => asText(item["ID Call"]) === callId);
  return legacy ? [legacy["Investigador Principal"], legacy["Investigador Secundário 1"], legacy["Investigador Secundário 2"]].map(asText).filter(Boolean) : [];
}

function fromCall(row: Row): Opportunity {
  const deadlineIso = /^\d{4}-\d{2}-\d{2}$/.test(asText(row.Deadline)) ? asText(row.Deadline) : null;
  const people = researchersForCall(asText(row.ID));
  const state = asText(row.Estado);
  return {
    id: asText(row.ID), source: "CALLS", name: asText(row.Call), code: asText(row["Código Oficial"]), program: asText(row.Programa), entity: asText(row.Entidade),
    area: asText(row["Área Estratégica IT"] || row["Área Principal"]), secondaryArea: asText(row["Área Secundária"]), group: asText(row["Grupos IT"] || row["Grupo Principal"]),
    researcher: people.join("; ") || asText(row["Investigadores Potencialmente Interessados"] || row["Investigador Principal"]), type: asText(row.Tipo), level: asText(row.Nível), state,
    fit: asText(row["Prioridade Relevância"] || row["Potencial IT"]), deadline: deadlineIso ? excelLabel(deadlineIso) : asText(row.Deadline) || "Por confirmar", deadlineIso, days: daysUntil(deadlineIso),
    condition: asText(row.Consórcio), why: asText(row["Área Tecnológica"] || row.Observações), keywords: asText(row["Keywords Call"]), observations: asText(row.Observações),
    link: asText(row.Link), action: asText(row["Ação Recomendada"]), priority: asText(row.Prioridade), companyRequired: asText(row["Empresa Obrigatória"]), partnerRequired: asText(row["Necessita Parceiro?"]),
    tone: state === "Aberta" ? "good" : state === "Prevista" ? "warn" : "neutral", raw: row,
  };
}

function fromRadar(row: Row): Opportunity {
  const deadlineIso = /^\d{4}-\d{2}-\d{2}$/.test(asText(row["Deadline Prevista"])) ? asText(row["Deadline Prevista"]) : null;
  return {
    id: asText(row["ID Radar"]), source: "RADAR", name: asText(row.Oportunidade), code: "", program: asText(row.Programa), entity: "", area: asText(row["Área / Tema"]), secondaryArea: "", group: asText(row["Grupos IT"]), researcher: "", type: asText(row.Tipo), level: "", state: "Radar", fit: asText(row["Potencial IT"]), deadline: deadlineIso ? excelLabel(deadlineIso) : "Por confirmar", deadlineIso, days: daysUntil(deadlineIso), condition: asText(row["Condição para Avançar"]), why: asText(row["Motivo RADAR"]), keywords: "", observations: asText(row.Observações), link: asText(row["Fonte Oficial"]), action: asText(row["Ação Recomendada"]), priority: asText(row.Prioridade), companyRequired: "", partnerRequired: asText(row["Parceiro Necessário"]), tone: "warn", raw: row,
  };
}

const callOpportunities = calls.map(fromCall);
const radarOpportunities = radar.map(fromRadar);
const allOpportunities = [...callOpportunities, ...radarOpportunities];

function searchable(item: Opportunity) {
  return [item.name, item.code, item.program, item.entity, item.type, item.level, item.area, item.secondaryArea, item.group, item.researcher, item.keywords, item.observations, item.why, item.state, item.companyRequired, item.partnerRequired].join(" ");
}

function matchesQuery(item: Opportunity, query: string) {
  const queryTerms = terms(query);
  if (!queryTerms.length) return true;
  const documentTerms = new Set(terms(searchable(item)));
  return queryTerms.every(term => documentTerms.has(term) || (term.length > 3 && [...documentTerms].some(candidate => candidate.startsWith(term))));
}

function includesValue(actual: string, expected?: string) {
  if (!expected || /^(todos|todas|qualquer)$/i.test(expected)) return true;
  return normalize(actual).includes(normalize(expected));
}

function filter(items: Opportunity[], filters: OpportunityFilters = {}) {
  return items.filter(item =>
    includesValue(item.program, filters.program) && includesValue(item.area, filters.area) && includesValue(item.group, filters.group) &&
    includesValue(item.researcher, filters.researcher) && includesValue(item.type, filters.type) && includesValue(item.state, filters.state) &&
    includesValue(`${item.entity} ${item.observations} ${item.companyRequired}`, filters.company) && (!filters.source || item.source === filters.source) &&
    (!filters.deadlineDays || (item.days !== null && item.days >= 0 && item.days <= filters.deadlineDays))
  );
}

function contextualScore(item: Opportunity, context: WorkspaceContext) {
  const contextTerms = new Set(terms(`${context.title} ${context.description} ${context.area ?? ""} ${context.group ?? ""} ${context.company ?? ""}`));
  const documentTerms = new Set(terms(searchable(item)));
  let score = [...contextTerms].filter(term => term.length > 2 && documentTerms.has(term)).length * 6;
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
  meta: source.meta,
  getAllOpportunities: (includeRadar = false) => includeRadar ? allOpportunities : callOpportunities,
  getOpportunity: (id: string) => allOpportunities.find(item => item.id === id) ?? null,
  searchGlobal: (query: string, filters: OpportunityFilters = {}) => filter(allOpportunities.filter(item => matchesQuery(item, query)), filters),
  filterOpportunities: (filters: OpportunityFilters = {}) => filter(callOpportunities, filters),
  getByGroup: (group: string) => filter(allOpportunities, { group }),
  getByProgram: (program: string) => filter(allOpportunities, { program }),
  getByCompany: (company: string) => filter(allOpportunities, { company }),
  getByInvestigator: (researcher: string) => filter(allOpportunities, { researcher }),
  getByDeadline: (deadlineDays: number) => filter(allOpportunities, { deadlineDays }),
  getContextualRecommendations: (context: WorkspaceContext, limit = 8) => allOpportunities.map(item => ({ item, score: contextualScore(item, context) })).filter(result => result.score > 0).sort((a, b) => b.score - a.score || (a.item.days ?? 99999) - (b.item.days ?? 99999)).slice(0, limit),
  selectForCommunication: (filters: OpportunityFilters = {}) => filter(allOpportunities, filters).filter(item => item.state === "Aberta" || item.state === "Prevista" || item.source === "RADAR"),
  getResearchersForCall: (callId: string) => researchersForCall(callId),
  getResearchers: () => researchers,
  getActions: () => callOpportunities.filter(item => item.action && !/não aplicável/i.test(item.action)).map(item => ({ id: item.id, label: item.action, call: item.name, due: item.deadline, days: item.days, done: /submetida|sem ação|não aplicável/i.test(asText(item.raw["Estado Interno"])) })),
  facets: {
    programs: unique(allOpportunities.map(item => item.program)), areas: unique(allOpportunities.map(item => item.area)), groups: unique(allOpportunities.flatMap(item => values(item.group))),
    researchers: unique(researchers.map(item => asText(item.Nome))), companies: unique(callOpportunities.map(item => item.entity)), types: unique(allOpportunities.map(item => item.type)), states: unique(allOpportunities.map(item => item.state)),
  },
  answerAssistant(question: string, context: WorkspaceContext) {
    const recommendations = this.getContextualRecommendations(context, 3);
    if (!recommendations.length) return "Não encontrei oportunidades com evidência suficiente para este Workspace. Reveja a área, grupo ou descrição.";
    const q = normalize(question);
    if (q.includes("parceir") || q.includes("consorcio")) return recommendations.map(({ item }) => `${item.name}: ${item.partnerRequired || item.condition || "condição não especificada"}`).join("\n");
    if (q.includes("investig")) return unique(recommendations.flatMap(({ item }) => researchersForCall(item.id))).slice(0, 5).join("; ") || "Sem investigadores validados no matching.";
    return `Melhor correspondência: ${recommendations[0].item.name} (${recommendations[0].score} pontos contextuais). ${recommendations[0].item.why}`;
  },
};

export type CoreEngine = typeof coreEngine;
