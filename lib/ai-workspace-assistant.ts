import { coreEngine, type Opportunity, type WorkspaceContext } from "@/lib/core-engine";

type Recognition = {
  title: string;
  terms: string[];
  matched: boolean;
};

export type IdeaAnalysis = {
  sourceLabel: string;
  rawText: string;
  titleSuggestion: string;
  summary: string;
  keywords: string[];
  area: string;
  technologyDomain: string;
  probableProgram: string;
  maturity: string;
  type: string;
  confidence: number;
  validationFlags: string[];
  entities: string[];
  companies: string[];
  universities: string[];
  countries: string[];
  suggestedGroups: string[];
  suggestedResearchers: string[];
  workspace: WorkspaceContext;
  recommendations: Array<{
    item: Opportunity;
    score: number;
    matchedKeywords: string[];
    matchedSignals: string[];
    explainWhy: string;
    nextSteps: string[];
  }>;
  shortlist: string[];
  nextSteps: string[];
  responseToResearcher: string;
  internalSummary: string;
  meetingNotes: string;
};

const AREA_RULES: Recognition[] = [
  { title: "IA & Computer Vision", terms: ["computer vision", "ai", "artificial intelligence", "machine learning", "deep learning", "imaging", "medical imaging", "vision"], matched: false },
  { title: "Redes & Comunicações", terms: ["network", "networking", "communication", "communications", "6g", "5g", "protocol", "wireless", "connectivity", "satellite link"], matched: false },
  { title: "HPC & Computação", terms: ["hpc", "high performance computing", "quantum computing", "parallel", "cloud", "computing"], matched: false },
  { title: "Energia & Power Electronics", terms: ["power", "energy", "grid", "storage", "converter", "inverter", "electronics", "renewable"], matched: false },
  { title: "Matemática Aplicada", terms: ["mathemat", "optimisation", "optimization", "statistics", "modelling", "modeling", "algorithm", "simulation"], matched: false },
  { title: "Espaço & GNSS", terms: ["satellite", "space", "gnss", "navigation", "earth observation", "orbit"], matched: false },
  { title: "Multimédia & Processamento de Sinal", terms: ["signal", "audio", "video", "multimedia", "speech", "image processing", "compression", "broadcast"], matched: false },
  { title: "Pattern and Image Analysis", terms: ["pattern", "image", "segmentation", "recognition", "classification", "computer vision"], matched: false },
];

const PROGRAM_RULES: Recognition[] = [
  { title: "ERC", terms: ["erc", "european research council"], matched: false },
  { title: "MSCA", terms: ["msca", "postdoctoral fellowship", "doctoral network", "staff exchange"], matched: false },
  { title: "Horizon Europe", terms: ["horizon europe", "cluster", "funding & tenders", "funding and tenders"], matched: false },
  { title: "Digital Europe", terms: ["digital europe", "step", "ai", "data", "skills", "cybersecurity"], matched: false },
  { title: "Eurostars", terms: ["eurostars", "eureka"], matched: false },
  { title: "COST", terms: ["cost action", "cost"], matched: false },
  { title: "ESA", terms: ["esa", "european space agency", "artes", "space"], matched: false },
  { title: "Chips JU", terms: ["chips", "chips ju", "semiconductor"], matched: false },
  { title: "Portugal 2030", terms: ["portugal 2030", "compete", "fct", "prr", "step"], matched: false },
  { title: "EIT", terms: ["eit", "eit health", "innoenergy", "manufacturing", "urban mobility"], matched: false },
];

const TYPE_RULES: Recognition[] = [
  { title: "Bolsas", terms: ["fellowship", "fellowships", "grant", "scholarship", "doctorate", "postdoctoral"], matched: false },
  { title: "I&D", terms: ["project", "research", "innovation", "development", "pilot", "prototype", "demo", "demonstrator"], matched: false },
  { title: "Networking", terms: ["networking", "consortium building", "consortium", "working group", "coordination"], matched: false },
  { title: "Brokerage", terms: ["brokerage", "partner search", "matchmaking"], matched: false },
  { title: "Webinars", terms: ["webinar", "info day", "infoday", "information day"], matched: false },
  { title: "Mobilidade", terms: ["mobility", "secondment", "exchange", "stsm"], matched: false },
];

const MATURITY_RULES = [
  { label: "TRIAGEM: fundamental / exploratory", terms: ["basic research", "fundamental", "theory", "proof of concept", "poc"] },
  { label: "TRL 3-4", terms: ["prototype", "prototype development", "laboratory", "experimental"] },
  { label: "TRL 5-6", terms: ["pilot", "demonstrator", "demonstration", "validation", "testbed"] },
  { label: "TRL 7-8", terms: ["deployment", "operational", "pre-commercial", "large scale"] },
];

const COUNTRY_RULES = ["portugal", "spain", "france", "germany", "italy", "netherlands", "belgium", "switzerland", "norway", "sweden", "finland", "denmark", "austria", "poland", "greece", "turkey", "united kingdom", "uk", "ireland", "usa", "united states", "brazil", "canada"];

const normalize = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const splitTokens = (text: string) => normalize(text).match(/[a-z0-9]+/g) ?? [];
const unique = (items: string[]) => [...new Set(items.filter(Boolean))];
const includesAny = (source: string, terms: string[]) => terms.some((term) => normalize(source).includes(normalize(term)));

function selectFromRules(source: string, rules: Recognition[]) {
  return rules.filter((rule) => includesAny(source, rule.terms)).map((rule) => rule.title);
}

function firstMatchLabel(source: string, rules: Recognition[], fallback: string) {
  return rules.find((rule) => includesAny(source, rule.terms))?.title ?? fallback;
}

function suggestTitle(rawText: string, sourceLabel: string, areas: string[], programs: string[]) {
  const trimmed = rawText.trim().replace(/\s+/g, " ");
  if (trimmed) {
    const firstSentence = trimmed.split(/[.!?\n]/)[0].trim();
    if (firstSentence.length > 12) return firstSentence.slice(0, 110);
  }
  if (programs[0]) return `${programs[0]} · ${areas[0] ?? "Oportunidade"}`;
  return sourceLabel ? `${sourceLabel} · Oportunidade em análise` : "Nova ideia de projeto";
}

function extractEntities(text: string) {
  const companies = unique(coreEngine.getCompanies().filter((item) => normalize(text).includes(normalize(item.name))).map((item) => item.name));
  const universities = unique(coreEngine.getInstitutions().filter((item) => /university|universidade|institut|college|school/i.test(item.name) && normalize(text).includes(normalize(item.name))).map((item) => item.name));
  const researchers = unique(coreEngine.getResearchers().filter((item) => normalize(text).includes(normalize(item.name))).map((item) => item.name));
  const countries = unique(COUNTRY_RULES.filter((country) => normalize(text).includes(country)));
  const entities = unique([...companies, ...universities, ...researchers, ...countries]);
  return { companies, universities, researchers, countries, entities };
}

function inferMaturity(text: string) {
  const lowered = normalize(text);
  for (const rule of MATURITY_RULES) {
    if (rule.terms.some((term) => lowered.includes(normalize(term)))) return rule.label;
  }
  const explicit = lowered.match(/trl\s*([0-9])(\s*[-/]\s*([0-9]))?/);
  if (explicit) return `TRL ${explicit[1]}${explicit[3] ? `-${explicit[3]}` : ""}`;
  return "por validar";
}

function inferProgram(text: string) {
  return firstMatchLabel(text, PROGRAM_RULES, "por validar");
}

function inferType(text: string) {
  return firstMatchLabel(text, TYPE_RULES, "por validar");
}

function inferArea(text: string) {
  return firstMatchLabel(text, AREA_RULES, "Transversal");
}

function inferTechnology(text: string) {
  const signals = [
    "AI & Health",
    "Quantum",
    "Digital Health",
    "6G",
    "GNSS",
    "Signal Processing",
    "Power Systems",
    "Computer Vision",
  ];
  const keywordMap: Array<[string, string]> = [
    ["health", "AI & Health"],
    ["medical", "AI & Health"],
    ["image", "Computer Vision"],
    ["vision", "Computer Vision"],
    ["network", "6G & Connectivity"],
    ["6g", "6G & Connectivity"],
    ["gnss", "GNSS"],
    ["satellite", "Space Systems"],
    ["power", "Power Electronics"],
    ["energy", "Power Systems"],
    ["signal", "Signal Processing"],
    ["multimedia", "Multimedia"],
    ["quantum", "Quantum"],
  ];
  const lowered = normalize(text);
  const hits = keywordMap.filter(([term]) => lowered.includes(term)).map(([, label]) => label);
  return unique(hits)[0] ?? signals[0];
}

function extractKeywords(text: string) {
  const candidates = [
    "ai", "artificial intelligence", "machine learning", "deep learning", "health", "medical imaging", "clinical", "network", "6g", "5g", "satellite", "gnss", "energy", "power electronics", "signal processing", "multimedia", "image analysis", "pattern recognition", "quantum", "mobility", "brokerage", "webinar", "consortium", "prototype", "pilot", "validation", "company", "research", "grant",
  ];
  return unique(candidates.filter((term) => normalize(text).includes(normalize(term))));
}

function buildNextSteps(area: string, type: string, entities: string[], companies: string[], universities: string[], researchers: string[]) {
  const steps = [
    "Validar interesse do investigador com a descrição resumida.",
    "Confirmar o enquadramento científico e o programa provável.",
  ];
  if (/health|sa[uú]de|clinical/i.test(area)) steps.push("Identificar parceiro clínico ou entidade do setor da saúde.");
  if (companies.length || /brokerage|empresa|industrial/i.test(type)) steps.push("Confirmar parceiro empresarial ou tecnológicao para o consórcio.");
  if (universities.length) steps.push("Verificar o papel das instituições mencionadas e a elegibilidade formal.");
  if (researchers.length) steps.push("Contactar o(s) investigador(es) identificados para validação técnica.");
  if (!entities.length) steps.push("Pesquisar parceiros complementares no ecossistema IT.");
  steps.push("Rever deadlines e condição de elegibilidade antes de comunicar ou registar a ideia.");
  return unique(steps);
}

function matchedSignalsFor(item: Opportunity, analysisKeywords: string[], area: string, program: string) {
  const itemText = normalize([item.name, item.code, item.program, item.area, item.secondaryArea, item.group, item.keywords, item.observations, item.why].join(" "));
  const keywords = unique(analysisKeywords.filter((keyword) => itemText.includes(normalize(keyword))));
  const signals = unique([
    ...(area !== "Transversal" && normalize(item.area).includes(normalize(area)) ? [area] : []),
    ...(program !== "por validar" && normalize(item.program).includes(normalize(program)) ? [program] : []),
    ...keywords,
  ]);
  return { keywords, signals };
}

function explainRecommendation(item: Opportunity, analysis: IdeaAnalysis, matchedKeywords: string[], matchedSignals: string[]) {
  const segments = [
    `Apareceu porque a ideia menciona ${matchedKeywords.slice(0, 4).join(", ") || "sinais temáticos alinhados"} e o registo contém ${item.area} / ${item.program}.`,
    matchedSignals.length ? `Sinais coincidentes: ${matchedSignals.join("; ")}.` : "Sem coincidências textuais fortes; a recomendação é contextual.",
    item.researcher ? `Grupos/investigadores associados na base: ${item.researcher}.` : "Não há investigadores diretamente validados para este registo.",
  ];
  return segments.join(" ");
}

function buildRecommendationNextSteps(item: Opportunity, analysis: IdeaAnalysis) {
  const steps = [
    "Validar se o call encaixa na ideia e no timing do investigador.",
    "Confirmar parceiros e elegibilidade da equipa.",
  ];
  if (/Aberta/.test(item.state)) steps.push("Preparar resposta ou reunião antes da deadline.");
  if (/Prevista|Radar/.test(item.state)) steps.push("Monitorizar a abertura oficial e guardar em radar.");
  if (analysis.companies.length || item.companyRequired === "Sim") steps.push("Confirmar empresa parceira ou consórcio relevante.");
  if (analysis.suggestedResearchers.length) steps.push("Contactar o grupo IT identificado para validação.");
  return unique(steps);
}

function buildSummary(analysis: IdeaAnalysis) {
  return [
    `Título sugerido: ${analysis.titleSuggestion}.`,
    `Área: ${analysis.area}. Programa provável: ${analysis.probableProgram}.`,
    `Tecnologia: ${analysis.technologyDomain}. Maturidade: ${analysis.maturity}.`,
    `Entidades mencionadas: ${analysis.entities.slice(0, 5).join("; ") || "por validar"}.`,
  ].join(" ");
}

function buildResearcherReply(analysis: IdeaAnalysis) {
  const top = analysis.recommendations[0];
  if (!top) return "Não encontrei ainda oportunidades suficientemente alinhadas. Vale a pena refinar o texto da ideia.";
  return `Analisei a ideia e encontrei uma primeira shortlist. A melhor correspondência parece ser ${top.item.name}, com ${top.score} pontos de adequação. ${top.explainWhy}`;
}

function buildMeetingNotes(analysis: IdeaAnalysis) {
  const top = analysis.recommendations[0];
  return [
    `Ideia analisada: ${analysis.titleSuggestion}.`,
    `Área / programa provável: ${analysis.area} / ${analysis.probableProgram}.`,
    `Shortlist inicial: ${analysis.shortlist.slice(0, 3).join(", ") || "sem oportunidades suficientes"}.`,
    `Próxima ação: ${analysis.nextSteps[0] || "validar a ideia com o gestor de pre-award"}.`,
    top ? `Melhor recomendação: ${top.item.name}.` : "Sem recomendação forte nesta passagem.",
  ].join("\n");
}

export function analyzeIdea(text: string, sourceLabel = "Texto livre"): IdeaAnalysis {
  const cleaned = text.trim();
  const area = inferArea(cleaned);
  const probableProgram = inferProgram(cleaned);
  const type = inferType(cleaned);
  const maturity = inferMaturity(cleaned);
  const technologyDomain = inferTechnology(cleaned);
  const keywords = extractKeywords(cleaned);
  const entities = extractEntities(cleaned);
  const groups = unique(coreEngine.facets.groups.filter((group) => includesAny(cleaned, [group])));
  const suggestedResearchers = unique(coreEngine.getResearchers().filter((person) => includesAny(cleaned, [person.name, ...person.keywords, ...person.expertiseTags])).map((item) => item.name));
  const titleSuggestion = suggestTitle(cleaned, sourceLabel, [area], [probableProgram]);
  const validationFlags = [
    !cleaned ? "Texto em falta" : "",
    probableProgram === "por validar" ? "Programa por validar" : "",
    type === "por validar" ? "Tipo de candidatura por validar" : "",
    maturity === "por validar" ? "TRL por validar" : "",
    !entities.entities.length ? "Entidades por validar" : "",
  ].filter(Boolean);
  const workspace: WorkspaceContext = {
    title: titleSuggestion,
    description: cleaned || "Descrição por validar",
    area,
    group: groups[0] ?? undefined,
    researcher: suggestedResearchers[0] ?? undefined,
    company: entities.companies[0] ?? undefined,
    program: probableProgram !== "por validar" ? probableProgram : undefined,
    deadlineDays: undefined,
  };
  const recommendations = coreEngine.getContextualRecommendations(workspace, 6).map(({ item, score }) => {
    const matched = matchedSignalsFor(item, keywords, area, probableProgram);
    return {
      item,
      score,
      matchedKeywords: matched.keywords,
      matchedSignals: matched.signals,
      explainWhy: explainRecommendation(item, {
        sourceLabel,
        rawText: cleaned,
        titleSuggestion,
        summary: "",
        keywords,
        area,
        technologyDomain,
        probableProgram,
        maturity,
        type,
        confidence: 0,
        validationFlags,
        entities: entities.entities,
        companies: entities.companies,
        universities: entities.universities,
        countries: entities.countries,
        suggestedGroups: groups,
        suggestedResearchers,
        workspace,
        recommendations: [],
        shortlist: [],
        nextSteps: [],
        responseToResearcher: "",
        internalSummary: "",
        meetingNotes: "",
      }, matched.keywords, matched.signals),
      nextSteps: buildRecommendationNextSteps(item, {
        sourceLabel,
        rawText: cleaned,
        titleSuggestion,
        summary: "",
        keywords,
        area,
        technologyDomain,
        probableProgram,
        maturity,
        type,
        confidence: 0,
        validationFlags,
        entities: entities.entities,
        companies: entities.companies,
        universities: entities.universities,
        countries: entities.countries,
        suggestedGroups: groups,
        suggestedResearchers,
        workspace,
        recommendations: [],
        shortlist: [],
        nextSteps: [],
        responseToResearcher: "",
        internalSummary: "",
        meetingNotes: "",
      }),
    };
  });
  const shortlist = recommendations.slice(0, 5).map((item) => item.item.id);
  const nextSteps = buildNextSteps(area, type, entities.entities, entities.companies, entities.universities, suggestedResearchers);
  const analysis: IdeaAnalysis = {
    sourceLabel,
    rawText: cleaned,
    titleSuggestion,
    summary: buildSummary({
      sourceLabel,
      rawText: cleaned,
      titleSuggestion,
      summary: "",
      keywords,
      area,
      technologyDomain,
      probableProgram,
      maturity,
      type,
      confidence: Math.min(95, 35 + keywords.length * 8 + recommendations.length * 6),
      validationFlags,
      entities: entities.entities,
      companies: entities.companies,
      universities: entities.universities,
      countries: entities.countries,
      suggestedGroups: groups,
      suggestedResearchers,
      workspace,
      recommendations,
      shortlist,
      nextSteps,
      responseToResearcher: "",
      internalSummary: "",
      meetingNotes: "",
    }),
    keywords,
    area,
    technologyDomain,
    probableProgram,
    maturity,
    type,
    confidence: Math.min(95, 35 + keywords.length * 8 + recommendations.length * 6),
    validationFlags,
    entities: entities.entities,
    companies: entities.companies,
    universities: entities.universities,
    countries: entities.countries,
    suggestedGroups: groups,
    suggestedResearchers,
    workspace,
    recommendations,
    shortlist,
    nextSteps,
    responseToResearcher: "",
    internalSummary: "",
    meetingNotes: "",
  };
  analysis.responseToResearcher = buildResearcherReply(analysis);
  analysis.internalSummary = [
    `Workspace criado para ${analysis.titleSuggestion}.`,
    `Área sugerida: ${analysis.area}. Programa provável: ${analysis.probableProgram}.`,
    analysis.validationFlags.length ? `A validar: ${analysis.validationFlags.join("; ")}.` : "Sem bloqueios críticos na análise heurística.",
    `Shortlist inicial: ${analysis.shortlist.length} oportunidades.`,
  ].join(" ");
  analysis.meetingNotes = buildMeetingNotes(analysis);
  return analysis;
}

export function buildWorkspaceFromIdea(text: string, sourceLabel = "Texto livre") {
  return analyzeIdea(text, sourceLabel).workspace;
}
