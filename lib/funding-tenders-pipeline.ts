import { coreEngine, type Opportunity } from "@/lib/core-engine";

export type PipelineMode = "dry-run" | "apply";
export type PipelineStage = "Discovery" | "Validation" | "Enrichment" | "Editorial Review" | "Publication";

export type PipelineValidationStatus = "pass" | "review" | "block";
export type PipelineEditorialStatus = "approved" | "review" | "hold";
export type PipelinePublicationStatus = "pending" | "published" | "skipped";

export type PipelineDiff = {
  field: string;
  before: string;
  after: string;
  confidence: number;
  reason: string;
};

export type PipelineStageState = {
  done: boolean;
  label: string;
  note: string;
};

export type FundingTendersPilotCandidate = {
  item: Opportunity;
  sourceLabel: string;
  confidence: number;
  stage: Record<PipelineStage, PipelineStageState>;
  validation: {
    status: PipelineValidationStatus;
    blockingIssues: string[];
    warnings: string[];
  };
  enrichment: {
    thematicCluster: string;
    normalizedGroup: string;
    recommendedAudience: string;
    recommendedAction: string;
    publicationTag: string;
  };
  editorial: {
    status: PipelineEditorialStatus;
    rationale: string;
    note: string;
  };
  publication: {
    status: PipelinePublicationStatus;
    summary: string;
  };
  diffs: PipelineDiff[];
  alreadyPublished: boolean;
};

export type FundingTendersPilotSummary = {
  sourceLabel: string;
  discovered: number;
  validated: number;
  enriched: number;
  editorialApproved: number;
  editorialReview: number;
  editorialHold: number;
  readyForPublication: number;
  published: number;
  averageConfidence: number;
  open: number;
  planned: number;
};

export type FundingTendersPilotRun = {
  mode: PipelineMode;
  generatedAt: string;
  summary: FundingTendersPilotSummary;
  candidates: FundingTendersPilotCandidate[];
};

const SOURCE_LABEL = "Funding & Tenders Portal";
const SOURCE_MATCHERS = [
  "ec.europa.eu/info/funding-tenders/opportunities/portal",
  "funding-tenders.ec.europa.eu",
];

const THEME_RULES: Array<{ test: RegExp; cluster: string }> = [
  { test: /\b(health|medical|clinical|bio|biotech|medicine)\b/i, cluster: "IA & Computer Vision" },
  { test: /\b(satellite|space|earth observation|gnss|navigation|astro)\b/i, cluster: "Espaço & GNSS" },
  { test: /\b(power|energy|grid|battery|storage|electr|smart grid)\b/i, cluster: "Energia & Power Electronics" },
  { test: /\b(network|connect|5g|6g|telecom|communications?|internet|cyber)\b/i, cluster: "Redes & Comunicações" },
  { test: /\b(image|vision|signal|multimedia|audio|video|pattern)\b/i, cluster: "Multimédia & Processamento de Sinal" },
  { test: /\b(math|optimi[sz]ation|statistics|stochastic|algebra|modeling)\b/i, cluster: "Matemática Aplicada" },
];

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function matchSource(item: Opportunity) {
  const link = clean((item as Record<string, unknown>).link ?? (item as Record<string, unknown>).Link ?? item.link);
  return SOURCE_MATCHERS.some((matcher) => link.includes(matcher));
}

function getField(item: Opportunity, ...names: string[]) {
  const source = item as Record<string, unknown>;
  for (const name of names) {
    if (name in source) return clean(source[name]);
  }
  return "";
}

function inferTheme(item: Opportunity) {
  const text = normalizeWhitespace(
    [
      item.name,
      item.code,
      item.program,
      item.entity,
      item.area,
      item.secondaryArea,
      item.group,
      item.keywords,
      item.observations,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const hit = THEME_RULES.find(({ test }) => test.test(text));
  return hit?.cluster ?? clean(item.area) ?? clean(item.secondaryArea) ?? "Transversal";
}

function inferRecommendedAction(item: Opportunity, confidence: number) {
  const text = `${item.fit} ${item.why} ${item.observations}`.toLowerCase();
  if (item.state === "Aberta" && (item.days ?? 9999) <= 30) return "Divulgar urgente";
  if (item.companyRequired || /empresa|industrial|pmi|sme|consórcio/i.test(text)) return "Preparar consórcio";
  if (confidence >= 85) return "Contactar investigador";
  if (item.state === "Prevista") return "Monitorizar";
  return "Rever no workspace";
}

function inferAudience(item: Opportunity) {
  const groups = clean(item.group)
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean);
  const researchers = clean(item.researcher)
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean);
  const audience = [...groups, ...researchers];
  return audience.length ? audience.slice(0, 3).join(" · ") : "A validar com coordenador";
}

function validationChecks(item: Opportunity) {
  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  if (!clean(item.name)) blockingIssues.push("Nome da call em falta");
  if (!clean(item.code)) blockingIssues.push("Código em falta");
  if (!clean(item.program)) blockingIssues.push("Programa em falta");
  if (!clean(item.entity)) blockingIssues.push("Entidade em falta");
  if (!clean(item.state)) blockingIssues.push("Estado em falta");
  if (!clean(item.deadline)) blockingIssues.push("Deadline em falta");
  if (!clean(item.link)) blockingIssues.push("Link oficial em falta");
  if (!clean(item.type)) warnings.push("Tipo por confirmar");
  if (!clean(item.group)) warnings.push("Grupo IT por confirmar");
  if (!clean(item.area) && !clean(item.secondaryArea)) warnings.push("Área estratégica por confirmar");
  if ((item.days ?? 9999) < 0 && item.state === "Aberta") warnings.push("Deadline vencida em estado aberto");

  return {
    status: blockingIssues.length > 0 ? "block" : warnings.length > 0 ? "review" : "pass",
    blockingIssues,
    warnings,
  } as const;
}

function calculateConfidence(item: Opportunity, validation: ReturnType<typeof validationChecks>) {
  const fields = [
    item.name,
    item.code,
    item.program,
    item.entity,
    item.type,
    item.state,
    item.deadline,
    item.link,
  ];
  const completenessScore = (fields.filter(Boolean).length / fields.length) * 42;
  const enrichmentScore = [
    item.area,
    item.secondaryArea,
    item.group,
    item.researcher,
    item.keywords,
    item.observations,
  ].filter(Boolean).length / 6 * 28;
  const freshnessScore = item.state === "Aberta" ? 12 : item.state === "Prevista" ? 9 : 6;
  const urgencyScore = item.days === null ? 4 : item.days <= 30 ? 12 : item.days <= 90 ? 10 : 6;
  const sourceScore = matchSource(item) ? 10 : 0;
  const penalty = validation.blockingIssues.length * 12 + validation.warnings.length * 2;
  return Math.max(0, Math.min(100, Math.round(completenessScore + enrichmentScore + freshnessScore + urgencyScore + sourceScore - penalty)));
}

function buildDiffs(item: Opportunity, validation: ReturnType<typeof validationChecks>, confidence: number) {
  const thematicCluster = inferTheme(item);
  const normalizedGroup = clean(item.group) || "A validar";
  const recommendedAudience = inferAudience(item);
  const recommendedAction = inferRecommendedAction(item, confidence);
  const publicationTag = validation.status === "block" ? "Em revisão" : confidence >= 85 ? "Elegível para publicação" : "Rever editorialmente";

  return [
    {
      field: "Discovery stage",
      before: "Não monitorizado",
      after: SOURCE_LABEL,
      confidence: 100,
      reason: "A oportunidade já está ligada ao portal oficial piloto.",
    },
    {
      field: "Validation status",
      before: "Não validado",
      after: validation.status === "pass" ? "Pass" : validation.status === "review" ? "Revisão" : "Bloqueado",
      confidence: validation.status === "pass" ? 95 : validation.status === "review" ? 82 : 68,
      reason: validation.blockingIssues.length ? validation.blockingIssues.join("; ") : validation.warnings.join("; ") || "Campos obrigatórios presentes.",
    },
    {
      field: "Enrichment output",
      before: "Sem enriquecimento",
      after: `${thematicCluster} · ${normalizedGroup}`,
      confidence: Math.max(72, confidence - 8),
      reason: "Classificação temática e cobertura de grupos normalizadas a partir dos metadados existentes.",
    },
    {
      field: "Editorial review",
      before: "Pendente",
      after: confidence >= 85 && validation.status === "pass" ? "Aprovar" : validation.status === "review" ? "Rever" : "Segurar",
      confidence: confidence >= 85 ? 92 : confidence >= 70 ? 79 : 65,
      reason: confidence >= 85 ? "A evidência está suficientemente forte para publicação controlada." : "O item exige validação editorial antes da publicação.",
    },
    {
      field: "Publication readiness",
      before: "Não calculado",
      after: publicationTag,
      confidence: confidence >= 85 ? 90 : 74,
      reason: `Audiência sugerida: ${recommendedAudience}. Ação: ${recommendedAction}.`,
    },
  ] satisfies PipelineDiff[];
}

function stageState(label: string, done: boolean, note: string): PipelineStageState {
  return { label, done, note };
}

export function getFundingTendersPilotCalls() {
  return coreEngine
    .getAllOpportunities(true)
    .filter((item) => matchSource(item))
    .sort((a, b) => (a.days ?? 99999) - (b.days ?? 99999) || a.name.localeCompare(b.name));
}

export function buildFundingTendersPilotRun(options?: {
  mode?: PipelineMode;
  approvedIds?: Set<string>;
  publishedIds?: Set<string>;
}) {
  const mode = options?.mode ?? "dry-run";
  const approvedIds = options?.approvedIds ?? new Set<string>();
  const publishedIds = options?.publishedIds ?? new Set<string>();
  const sourceItems = getFundingTendersPilotCalls();

  const candidates = sourceItems.map((item) => {
    const validation = validationChecks(item);
    const confidence = calculateConfidence(item, validation);
    const thematicCluster = inferTheme(item);
    const normalizedGroup = clean(item.group) || "A validar";
    const recommendedAudience = inferAudience(item);
    const recommendedAction = inferRecommendedAction(item, confidence);
    const isApproved = approvedIds.has(item.id) ? true : confidence >= 85 && validation.status === "pass";
    const alreadyPublished = publishedIds.has(item.id);
    const publicationStatus: PipelinePublicationStatus = alreadyPublished
      ? "published"
      : mode === "apply" && isApproved && validation.status !== "block"
        ? "published"
        : "pending";
    const editorialStatus: PipelineEditorialStatus = validation.status === "block"
      ? "hold"
      : confidence >= 85
        ? "approved"
        : "review";
    const stage = {
      Discovery: stageState("Discovery", true, "Fonte piloto detetada no Funding & Tenders Portal."),
      Validation: stageState("Validation", validation.status !== "block", validation.blockingIssues.join(" · ") || validation.warnings.join(" · ") || "Campos obrigatórios confirmados."),
      Enrichment: stageState("Enrichment", true, `${thematicCluster} · ${normalizedGroup}`),
      "Editorial Review": stageState("Editorial Review", editorialStatus === "approved", editorialStatus === "approved" ? "Aprovação automática possível." : editorialStatus === "review" ? "Rever manualmente." : "Bloqueado por validação."),
      Publication: stageState("Publication", publicationStatus === "published", publicationStatus === "published" ? "Publicado no registo local do piloto." : "A aguardar aplicação."),
    } satisfies Record<PipelineStage, PipelineStageState>;

    return {
      item,
      sourceLabel: SOURCE_LABEL,
      confidence,
      stage,
      validation,
      enrichment: {
        thematicCluster,
        normalizedGroup,
        recommendedAudience,
        recommendedAction,
        publicationTag: validation.status === "block" ? "Em revisão" : confidence >= 85 ? "Elegível para publicação" : "Rever editorialmente",
      },
      editorial: {
        status: editorialStatus,
        rationale: validation.status === "block"
          ? "Existem campos obrigatórios em falta."
          : confidence >= 85
            ? "A combinação de metadados e alinhamento tem confiança suficiente para publicação controlada."
            : "Requer validação humana antes de avançar.",
        note: confidence >= 85
          ? "Preparar publicação controlada no piloto."
          : "Manter em revisão editorial.",
      },
      publication: {
        status: publicationStatus,
        summary: publicationStatus === "published"
          ? "Entrada publicada no registo do piloto."
          : mode === "apply" && isApproved
            ? "Pronta para publicação."
            : "Ainda não publicada.",
      },
      diffs: buildDiffs(item, validation, confidence),
      alreadyPublished,
    } satisfies FundingTendersPilotCandidate;
  });

  const summary = candidates.reduce<FundingTendersPilotSummary>((acc, candidate) => {
    acc.discovered += 1;
    if (candidate.validation.status !== "block") acc.validated += 1;
    if (candidate.enrichment.thematicCluster) acc.enriched += 1;
    if (candidate.editorial.status === "approved") acc.editorialApproved += 1;
    if (candidate.editorial.status === "review") acc.editorialReview += 1;
    if (candidate.editorial.status === "hold") acc.editorialHold += 1;
    if (candidate.editorial.status === "approved" && !candidate.alreadyPublished) acc.readyForPublication += 1;
    if (candidate.publication.status === "published") acc.published += 1;
    if (candidate.item.state === "Aberta") acc.open += 1;
    if (candidate.item.state === "Prevista") acc.planned += 1;
    acc.averageConfidence += candidate.confidence;
    return acc;
  }, {
    sourceLabel: SOURCE_LABEL,
    discovered: 0,
    validated: 0,
    enriched: 0,
    editorialApproved: 0,
    editorialReview: 0,
    editorialHold: 0,
    readyForPublication: 0,
    published: 0,
    averageConfidence: 0,
    open: 0,
    planned: 0,
  });

  summary.averageConfidence = candidates.length ? Math.round(summary.averageConfidence / candidates.length) : 0;

  return {
    mode,
    generatedAt: new Date().toISOString(),
    summary,
    candidates,
  } satisfies FundingTendersPilotRun;
}

