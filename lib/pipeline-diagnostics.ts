import { coreEngine, type Opportunity } from "@/lib/core-engine";
import type { FundingTendersPilotRun } from "@/lib/funding-tenders-pipeline";
import type { WeeklyBriefing } from "@/lib/sfip-autonomy";

export type PipelineDiagnostics = {
  lastExecutionAt: string | null;
  pipelineExecuted: boolean;
  sourceChecks: string[];
  freshnessLabel: string;
  freshnessCurrent: boolean;
  counts: {
    newCalls: number;
    updatedCalls: number;
    closedCalls: number;
    removedCalls: number;
    newWebinars: number;
    newBrokerageEvents: number;
    syncErrors: number;
  };
  stateConsistency: {
    openWithPastDeadline: Opportunity[];
    plannedWithoutFutureOpening: Opportunity[];
    inconsistentCount: number;
    allPagesUseSameTemporalRule: boolean;
  };
  importedFields: string[];
  calculatedFields: string[];
  actionsRequired: string[];
};

function timeAgo(value: string | null | undefined) {
  if (!value) return "Sem execução";
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.max(0, Math.round(diff / 36e5));
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.max(1, Math.round(hours / 24))} dias atrás`;
}

export function buildPipelineDiagnostics(report: FundingTendersPilotRun, briefing: WeeklyBriefing | null, lastRunAt: string | null): PipelineDiagnostics {
  const openWithPastDeadline = report.candidates.filter((candidate) => candidate.item.state === "Aberta" && (candidate.item.days ?? 9999) < 0).map((candidate) => candidate.item);
  const plannedWithoutFutureOpening = report.candidates.filter((candidate) => candidate.item.state === "Prevista" && candidate.item.days !== null && candidate.item.days < 0).map((candidate) => candidate.item);
  const freshnessCurrent = report.candidates.every((candidate) => candidate.item.state !== "Aberta" || candidate.item.days === null || candidate.item.days >= 0);

  const importedFields = [
    "Título / código / programa",
    "Entidade / países elegíveis",
    "Datas oficiais",
    "Keywords e área temática",
    "Grupo IT e investigadores sugeridos",
    "Link oficial / documentação",
    "Tipologia / elegibilidade / consórcio",
  ];

  const calculatedFields = [
    "Estado",
    "Dias Restantes",
    "Urgência",
    "Prioridade",
    "Publicação editorial",
    "Recomendação contextual",
    "Ação sugerida",
  ];

  const actionsRequired: string[] = [];
  if (!lastRunAt) actionsRequired.push("Executar o pipeline pelo menos uma vez para registar a última execução.");
  if (report.summary.discovered === 0) actionsRequired.push("Verificar se a fonte piloto está a entregar registos.");
  if (briefing && briefing.summary.syncErrorCount > 0) actionsRequired.push("Corrigir inconsistências assinaladas pelo briefing semanal.");
  if (openWithPastDeadline.length) actionsRequired.push("Corrigir registos abertos com deadline já vencida.");
  if (plannedWithoutFutureOpening.length) actionsRequired.push("Rever oportunidades previstas sem abertura futura coerente.");

  return {
    lastExecutionAt: lastRunAt,
    pipelineExecuted: Boolean(lastRunAt),
    sourceChecks: [
      report.summary.sourceLabel,
      coreEngine.meta.sourceWorkbook,
      briefing ? "Weekly Briefing / Snapshot de autonomia" : "Sem briefing anterior para comparação",
    ],
    freshnessLabel: timeAgo(lastRunAt),
    freshnessCurrent,
    counts: {
      newCalls: briefing?.summary.newCount ?? 0,
      updatedCalls: briefing?.summary.changedDeadlinesCount ?? 0,
      closedCalls: briefing?.summary.closedCount ?? 0,
      removedCalls: briefing?.summary.removedCount ?? 0,
      newWebinars: briefing?.summary.webinarCount ?? 0,
      newBrokerageEvents: briefing?.summary.brokerageCount ?? 0,
      syncErrors: briefing?.summary.syncErrorCount ?? 0,
    },
    stateConsistency: {
      openWithPastDeadline,
      plannedWithoutFutureOpening,
      inconsistentCount: openWithPastDeadline.length + plannedWithoutFutureOpening.length,
      allPagesUseSameTemporalRule: openWithPastDeadline.length === 0 && plannedWithoutFutureOpening.length === 0,
    },
    importedFields,
    calculatedFields,
    actionsRequired,
  };
}
