import fs from "node:fs/promises";
import path from "node:path";
import { computeDaysRemaining, computeTemporalCallState } from "../lib/sfip-temporal-state.js";

const root = path.resolve(process.cwd());
const sourcePath = path.join(root, "data", "core-data.json");
const outputPath = path.join(root, "data", "sfip-canonical-model.json");

const source = JSON.parse(await fs.readFile(sourcePath, "utf8"));
const now = new Date().toISOString();

const asText = (value) => value == null ? "" : String(value).trim();
const clean = (value) => asText(value).replace(/\s+/g, " ");
const toDate = (value) => {
  const text = asText(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return null;
};
const splitValues = (value) => asText(value).split(/[;,]/).map((item) => item.trim()).filter(Boolean);
const tokens = (value) => clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]+/g) ?? [];
const unique = (values) => [...new Set(values.filter(Boolean))];
const normalizeName = (value) => clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

const sourceRefs = [
  { id: "fct", name: "FCT", category: "Institution" },
  { id: "horizon-europe", name: "Horizon Europe", category: "Funding Program" },
  { id: "digital-europe", name: "Digital Europe", category: "Funding Program" },
  { id: "erc", name: "European Research Council", category: "Funding Program" },
  { id: "radar-strategy", name: "Radar Estratégico", category: "Radar" },
];

const researcherLookup = new Map();
for (const row of source.researchers ?? []) {
  const name = clean(row.Nome);
  if (!name) continue;
  researcherLookup.set(normalizeName(name), asText(row["ID Investigador"]) || name);
}

const programIndex = new Map();
const programs = [];
function ensureProgram(name) {
  const key = clean(name).toLowerCase();
  if (programIndex.has(key)) return programIndex.get(key);
  const program = {
    id: `program-${programs.length + 1}`,
    sourceId: "fct",
    officialName: clean(name),
    acronym: undefined,
    parentProgram: undefined,
    domain: undefined,
    officialUrl: "",
    coverage: "",
    monitoringPriority: "medium",
  };
  programIndex.set(key, program.id);
  programs.push(program);
  return program.id;
}

const callKnowledge = [];
const calls = (source.calls ?? []).map((row) => {
  const id = asText(row.ID);
  const programId = ensureProgram(row.Programa);
  const deadline = toDate(row.Deadline);
  const opening = toDate(row["Data Abertura"]);
  const stateComputed = computeTemporalCallState({ openedAt: opening, deadlineAt: deadline });
  const urgencyScore = stateComputed === "Aberta" && deadline ? Math.max(0, 100 - (computeDaysRemaining(deadline) ?? 0)) : stateComputed === "Prevista" ? 30 : 10;
  const searchable = [
    row.Call,
    row["Código Oficial"],
    row.Programa,
    row.Entidade,
    row.Tipo,
    row["Nível"],
    row["Área Principal"],
    row["Área Secundária"],
    row["Área Estratégica IT"],
    row["Grupos IT"],
    row["Investigadores Potencialmente Interessados"],
    row["Keywords Call"],
    row["Área Tecnológica"],
    row.Observações,
    row.Link,
  ].filter(Boolean).map(asText).join(" ");
  const entry = {
    id,
    sourceId: "excel-import",
    programId,
    officialCode: asText(row["Código Oficial"]) || id,
    officialTitle: asText(row.Call),
    entity: { id: `entity-${clean(row.Entidade).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name: clean(row.Entidade) },
    type: clean(row.Tipo),
    level: clean(row["Nível"]),
    areaPrimary: clean(row["Área Principal"] || row["Área Estratégica IT"] || "Transversal"),
    areaSecondary: clean(row["Área Secundária"]),
    thematicKeywords: unique([
      ...splitValues(row["Keywords Call"]),
      ...splitValues(row["Área Tecnológica"]),
      ...splitValues(row.Observações),
    ]),
    targetGroups: splitValues(row["Grupos IT"]),
    eligibility: {
      consortiumRequired: /sim/i.test(asText(row.Consórcio)),
      companyRequired: /sim/i.test(asText(row["Empresa Obrigatória"])),
      minPartners: null,
      minCountries: null,
      ttrl: null,
      geography: [],
      duration: clean(row.Duração),
      budget: null,
      maxPerProject: null,
      fundingRate: null,
    },
    dates: { openedAt: opening, deadlineAt: deadline, lastVerifiedAt: toDate(row["Última Verificação"]) },
    links: { official: asText(row.Link), documentation: [] },
    status: stateComputed,
    sourcePriority: 1,
    notes: clean(row.Observações),
    rawImportId: id,
  };
  callKnowledge.push({
    id: `index-call-${id}`,
    entityType: "call",
    entityId: id,
    title: entry.officialTitle,
    tokens: unique(tokens(searchable)),
    programId,
    sourceId: "excel-import",
    searchableText: searchable,
    lastIndexedAt: now,
  });
  return entry;
});

const radar = (source.radar ?? []).map((row) => {
  const title = asText(row.Oportunidade);
  const searchable = [
    title,
    row.Programa,
    row.Origem,
    row.Tipo,
    row["Área / Tema"],
    row["Grupos IT"],
    row["Motivo RADAR"],
    row["Ação Recomendada"],
    row["Parceiro Necessário"],
    row.Observações,
    row["Fonte Oficial"],
  ].filter(Boolean).map(asText).join(" ");
  return {
    id: asText(row["ID Radar"]),
    sourceId: "radar-import",
    title,
    programId: row.Programa ? ensureProgram(row.Programa) : null,
    theme: clean(row["Área / Tema"]),
    groupHints: splitValues(row["Grupos IT"]),
    status: "monitoring",
    nextReviewAt: toDate(row["Próxima Verificação"]),
    deadlineForecastAt: toDate(row["Deadline Prevista"]),
    officialUrl: asText(row["Fonte Oficial"]) || null,
    notes: clean(row.Observações),
    confidence: 70,
  };
});

const eventMap = new Map();
const events = [];
for (const row of source.calls ?? []) {
  const type = clean(row.Tipo).toLowerCase();
  if (!/(webinar|info|brokerage|event|network|mobility|training)/i.test(type)) continue;
  const title = clean(row.Call);
  const key = `${clean(row.Programa)}::${title}`;
  if (eventMap.has(key)) continue;
  const event = {
    id: `event-${events.length + 1}`,
    sourceId: "excel-import",
    title,
    programId: ensureProgram(row.Programa),
    type: /webinar/i.test(type) ? "webinar" : /brokerage/i.test(type) ? "brokerage" : /training/i.test(type) ? "training" : /network/i.test(type) ? "partner search" : /info/i.test(type) ? "info day" : "other",
    startsAt: toDate(row["Data Abertura"]),
    endsAt: toDate(row.Deadline),
    registrationDeadlineAt: toDate(row.Deadline),
    audience: splitValues(row["Grupos IT"]),
    officialUrl: asText(row.Link),
    notes: clean(row.Observações),
  };
  eventMap.set(key, true);
  events.push(event);
}

const researchers = (source.researchers ?? []).map((row) => {
  const name = clean(row.Nome);
  return {
    id: asText(row["ID Investigador"]),
    name,
    groupId: `group-${clean(row["Grupo IT"]).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    institutionId: "it-covilha",
    profileUrl: asText(row["URL IT"]),
    orcid: asText(row.ORCID) || undefined,
    cienciaId: asText(row["Ciência ID"]) || undefined,
    expertiseTags: unique([
      ...splitValues(row["Keywords Normalizadas"]),
      ...splitValues(row["Tecnologias / Metodologias"]),
      ...splitValues(row["Domínios de Aplicação"]),
      clean(row["Área Principal"]),
      clean(row["Áreas Secundárias"]),
    ]),
    keywords: unique([
      ...splitValues(row["Keywords Normalizadas"]),
      ...splitValues(row["Tecnologias / Metodologias"]),
    ]),
    active: /validado|alto|médio/i.test(asText(row["Estado de Validação"])) || true,
    lastVerifiedAt: toDate(row["Última Verificação"]),
  };
});

const institutionSet = new Map([
  ["it-covilha", { id: "it-covilha", name: "Instituto de Telecomunicações — Covilhã", kind: "research organization", country: "Portugal", officialUrl: "https://www.it.pt/", sourceRefs: ["it"] }],
]);
for (const row of source.calls ?? []) {
  const name = clean(row.Entidade);
  if (!name || institutionSet.has(name.toLowerCase())) continue;
  institutionSet.set(name.toLowerCase(), { id: `institution-${institutionSet.size + 1}`, name, kind: "funding agency", country: undefined, officialUrl: asText(row.Link) || undefined, sourceRefs: [asText(row.Origem) || "import"] });
}
const institutions = [...institutionSet.values()];

const companies = unique((source.calls ?? []).map((row) => clean(row.Entidade)).filter((name) => /company|ltd|s\.a|sa$|inc|gmbh|corp|empresa/i.test(name))).map((name, index) => ({
  id: `company-${index + 1}`,
  name,
  country: undefined,
  sectorTags: [],
  capabilities: [],
  contactHints: [],
  sourceRefs: ["call-import"],
}));

const workspaces = [];
const campaigns = [];
const history = [];

const knowledgeIndex = [
  ...callKnowledge,
  ...radar.map((item) => ({
    id: `index-radar-${item.id}`,
    entityType: "radar",
    entityId: item.id,
    title: item.title,
    tokens: unique(tokens(`${item.title} ${item.theme} ${item.groupHints.join(" ")} ${item.notes ?? ""}`)),
    programId: item.programId ?? null,
    sourceId: item.sourceId,
    searchableText: `${item.title} ${item.theme} ${item.groupHints.join(" ")} ${item.notes ?? ""}`,
    lastIndexedAt: now,
  })),
  ...researchers.map((person) => ({
    id: `index-researcher-${person.id}`,
    entityType: "researcher",
    entityId: person.id,
    title: person.name,
    tokens: unique(tokens(`${person.name} ${person.keywords.join(" ")} ${person.expertiseTags.join(" ")}`)),
    programId: null,
    sourceId: "researcher-import",
    searchableText: `${person.name} ${person.keywords.join(" ")} ${person.expertiseTags.join(" ")}`,
    lastIndexedAt: now,
  })),
];

const canonical = {
  sources: sourceRefs,
  programs,
  calls,
  callIntelligence: calls.map((call) => {
    const deadline = call.dates.deadlineAt;
    const daysRemaining = computeDaysRemaining(deadline);
    const stateComputed = computeTemporalCallState({ openedAt: call.dates.openedAt ?? null, deadlineAt: deadline });
    const urgencyScore = stateComputed === "Aberta" && daysRemaining !== null ? Math.max(0, 100 - daysRemaining) : stateComputed === "Prevista" ? 30 : 10;
    return {
      callId: call.id,
      stateComputed,
      daysRemaining,
      urgencyScore,
      relevanceScore: Math.max(0, 50 + (call.targetGroups.length * 3) + (call.thematicKeywords.length * 2)),
      potentialIt: asText((source.calls ?? []).find((r) => asText(r.ID) === call.id)?.["Potencial IT"]),
      areaStrategicIt: clean((source.calls ?? []).find((r) => asText(r.ID) === call.id)?.["Área Estratégica IT"]),
      groupsIt: call.targetGroups,
      researchersSuggested: unique([
        ...splitValues((source.calls ?? []).find((r) => asText(r.ID) === call.id)?.["Investigador Principal"]).map((name) => researcherLookup.get(normalizeName(name)) ?? null),
        ...splitValues((source.calls ?? []).find((r) => asText(r.ID) === call.id)?.["Investigadores Potencialmente Interessados"]).map((name) => researcherLookup.get(normalizeName(name)) ?? null),
      ]),
      partnerNeeds: splitValues((source.calls ?? []).find((r) => asText(r.ID) === call.id)?.["Necessita Parceiro?"]),
      communicationTags: unique([call.type, call.status, call.areaPrimary, ...call.targetGroups.slice(0, 3)]),
      radarDecision: undefined,
      explainWhy: clean((source.calls ?? []).find((r) => asText(r.ID) === call.id)?.["Área Tecnológica"]) || call.notes || "",
      validatedAt: call.dates.lastVerifiedAt ? `${call.dates.lastVerifiedAt}T00:00:00Z` : undefined,
      confidence: 80,
    };
  }),
  radar,
  events,
  companies,
  institutions,
  researchers,
  workspaces,
  campaigns,
  history,
  knowledgeIndex,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(canonical, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
