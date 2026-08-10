"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { buildFundingTendersPilotRun, getFundingTendersPilotCalls, type FundingTendersPilotCandidate, type PipelineMode } from "@/lib/funding-tenders-pipeline";
import { loadFundingTendersPipelineState, saveFundingTendersPipelineState, type FundingTendersPipelineDecision } from "@/lib/funding-tenders-pipeline-store";
import { buildWeeklyBriefing, loadAutonomousSnapshot, type WeeklyBriefing } from "@/lib/sfip-autonomy";
import { buildPipelineDiagnostics } from "@/lib/pipeline-diagnostics";
import type { Mission } from "@/lib/sfip-types";

const decisionTone: Record<FundingTendersPipelineDecision, "good" | "warn" | "neutral"> = {
  approved: "good",
  review: "warn",
  hold: "neutral",
};

function Badge({ tone = "neutral", children }: { tone?: "good" | "warn" | "neutral"; children: ReactNode }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="confidence-meter" aria-label={`Confidence ${value}%`}>
      <span style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Por confirmar";
  try {
    return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
  } catch {
    return value;
  }
}

function timeAgo(value: string | null | undefined) {
  if (!value) return "Sem execução";
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.max(0, Math.round(diff / 36e5));
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.max(1, Math.round(hours / 24))} dias atrás`;
}

function candidateSearchText(candidate: FundingTendersPilotCandidate) {
  return [
    candidate.item.name,
    candidate.item.code,
    candidate.item.program,
    candidate.item.entity,
    candidate.item.type,
    candidate.item.state,
    candidate.item.group,
    candidate.item.researcher,
    candidate.item.observations,
    candidate.enrichment.thematicCluster,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

type Props = {
  navigate: (mission: Mission) => void;
};

export function FundingTendersPipelineScreen({ navigate }: Props) {
  const [mode, setMode] = useState<PipelineMode>("dry-run");
  const [viewMode, setViewMode] = useState<"pipeline" | "diagnostic">("pipeline");
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<"Todos" | "Aberta" | "Prevista">("Todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, FundingTendersPipelineDecision>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [published, setPublished] = useState<Array<{ itemId: string; name: string; confidence: number; publishedAt: string; mode: PipelineMode }>>([]);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<WeeklyBriefing | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = loadFundingTendersPipelineState(window.localStorage);
    if (saved) {
      setMode(saved.mode);
      setSelectedId(saved.selectedId);
      setDecisions(saved.approvals);
      setNotes(saved.notes);
      setPublished(saved.published);
      setLastRunAt(saved.lastRunAt);
    }
    setBriefing(buildWeeklyBriefing(loadAutonomousSnapshot(window.localStorage)));
    setLoaded(true);
  }, []);

  const report = useMemo(() => {
    const approvedIds = new Set(
      Object.entries(decisions)
        .filter(([, decision]) => decision === "approved")
        .map(([id]) => id),
    );
    const publishedIds = new Set(published.map((entry) => entry.itemId));
    return buildFundingTendersPilotRun({ mode, approvedIds, publishedIds });
  }, [mode, decisions, published]);

  useEffect(() => {
    if (!loaded || selectedId || !report.candidates.length) return;
    setSelectedId(report.candidates[0].item.id);
  }, [loaded, report.candidates, selectedId]);

  useEffect(() => {
    if (!loaded || Object.keys(decisions).length || !report.candidates.length) return;
    const next: Record<string, FundingTendersPipelineDecision> = {};
    for (const candidate of report.candidates) {
      next[candidate.item.id] = candidate.editorial.status === "approved" ? "approved" : candidate.editorial.status === "review" ? "review" : "hold";
    }
    setDecisions(next);
  }, [loaded, decisions, report.candidates]);

  useEffect(() => {
    if (!loaded) return;
    saveFundingTendersPipelineState(window.localStorage, {
      mode,
      selectedId,
      approvals: decisions,
      notes,
      published,
      lastRunAt,
    });
  }, [loaded, mode, selectedId, decisions, notes, published, lastRunAt]);

  const visibleCandidates = useMemo(() => {
    return report.candidates.filter((candidate) => {
      const matchesQuery = !query.trim() || candidateSearchText(candidate).includes(query.trim().toLowerCase());
      const matchesState = stateFilter === "Todos" || candidate.item.state === stateFilter;
      return matchesQuery && matchesState;
    });
  }, [query, report.candidates, stateFilter]);

  const selected = visibleCandidates.find((candidate) => candidate.item.id === selectedId) ?? visibleCandidates[0] ?? report.candidates.find((candidate) => candidate.item.id === selectedId) ?? report.candidates[0] ?? null;
  const diagnostics = useMemo(() => buildPipelineDiagnostics(report, briefing, lastRunAt), [report, briefing, lastRunAt]);

  const approvedCount = report.candidates.filter((candidate) => decisions[candidate.item.id] === "approved").length;
  const reviewCount = report.candidates.filter((candidate) => decisions[candidate.item.id] === "review").length;
  const holdCount = report.candidates.filter((candidate) => decisions[candidate.item.id] === "hold").length;
  const readyToPublish = report.candidates.filter((candidate) => decisions[candidate.item.id] === "approved" && !published.some((entry) => entry.itemId === candidate.item.id)).length;

  const runPipeline = () => {
    const now = new Date().toISOString();
    if (mode === "apply") {
      setPublished((current) => {
        const existing = new Set(current.map((entry) => entry.itemId));
        const additions = report.candidates
          .filter((candidate) => decisions[candidate.item.id] === "approved" && !existing.has(candidate.item.id))
          .map((candidate) => ({
            itemId: candidate.item.id,
            name: candidate.item.name,
            confidence: candidate.confidence,
            publishedAt: now,
            mode,
          }));
        return additions.length ? [...current, ...additions] : current;
      });
    }
    setLastRunAt(now);
  };

  const updateDecision = (id: string, decision: FundingTendersPipelineDecision) => {
    setDecisions((current) => ({ ...current, [id]: decision }));
  };

  const pilotItems = getFundingTendersPilotCalls();

  return (
    <div className="pipeline-screen">
      <div className="screen-title">
        <div>
          <span>PIPELINE PILOTO</span>
          <h1>Funding & Tenders Portal</h1>
          <p>Validação de ponta a ponta para uma única fonte oficial, com Dry Run, Apply, Diff Viewer e confidence score por alteração.</p>
        </div>
        <div className="title-actions pipeline-actions">
          <div className="mode-switch">
            <button className={mode === "dry-run" ? "active" : ""} onClick={() => setMode("dry-run")}>Dry Run</button>
            <button className={mode === "apply" ? "active" : ""} onClick={() => setMode("apply")}>Apply</button>
          </div>
          <div className="mode-switch">
            <button className={viewMode === "pipeline" ? "active" : ""} onClick={() => setViewMode("pipeline")}>Pipeline</button>
            <button className={viewMode === "diagnostic" ? "active" : ""} onClick={() => setViewMode("diagnostic")}>Diagnóstico</button>
          </div>
          <button className="button secondary" onClick={() => navigate("opportunities")}>Abrir catálogo</button>
          <button className="button" onClick={runPipeline}>{mode === "apply" ? "Publicar aprovados" : "Executar Dry Run"}</button>
        </div>
      </div>

      {viewMode === "diagnostic" && (
        <section className="pipeline-diagnostic panel">
          <div className="panel-heading">
            <div>
              <span className="section-label">DIAGNÓSTICO</span>
              <h2>Frescura dos dados e integridade da sincronização</h2>
            </div>
            <Badge tone={diagnostics.pipelineExecuted ? "good" : "warn"}>{diagnostics.pipelineExecuted ? "Pipeline com execução registada" : "Ainda sem execução"}</Badge>
          </div>
          <div className="pipeline-stats diagnostic-stats">
            <article><strong>{diagnostics.counts.newCalls}</strong><span>Novas calls</span><small>Encontradas desde o último snapshot</small></article>
            <article><strong>{diagnostics.counts.updatedCalls}</strong><span>Calls atualizadas</span><small>Deadlines e metadados alterados</small></article>
            <article><strong>{diagnostics.counts.closedCalls}</strong><span>Calls encerradas</span><small>Passaram a encerradas</small></article>
            <article><strong>{diagnostics.counts.removedCalls}</strong><span>Calls removidas</span><small>Já não constam da sincronização</small></article>
            <article><strong>{diagnostics.counts.newWebinars + diagnostics.counts.newBrokerageEvents}</strong><span>Eventos novos</span><small>{diagnostics.counts.newWebinars} webinars · {diagnostics.counts.newBrokerageEvents} brokerage</small></article>
          </div>
          <div className="diagnostic-grid">
            <div className="diagnostic-card">
              <small>Última execução</small>
              <strong>{diagnostics.lastExecutionAt ? formatDate(diagnostics.lastExecutionAt) : "Ainda sem execução"}</strong>
              <span>{diagnostics.freshnessLabel}</span>
            </div>
            <div className="diagnostic-card">
              <small>Fontes verificadas</small>
              <strong>{diagnostics.sourceChecks[0]}</strong>
              <span>{diagnostics.sourceChecks.slice(1).join(" · ")}</span>
            </div>
            <div className="diagnostic-card">
              <small>Estado temporal</small>
              <strong>{diagnostics.stateConsistency.allPagesUseSameTemporalRule ? "Consistente" : "Inconsistências detetadas"}</strong>
              <span>{diagnostics.stateConsistency.inconsistentCount} registos com conflito temporal</span>
            </div>
          </div>
          <div className="diagnostic-columns">
            <div><strong>Campos importados</strong><ul>{diagnostics.importedFields.map((field) => <li key={field}>{field}</li>)}</ul></div>
            <div><strong>Campos calculados</strong><ul>{diagnostics.calculatedFields.map((field) => <li key={field}>{field}</li>)}</ul></div>
            <div><strong>Problemas detetados</strong><ul>{diagnostics.actionsRequired.length ? diagnostics.actionsRequired.map((item) => <li key={item}>{item}</li>) : <li>Sem bloqueios críticos.</li>}</ul></div>
          </div>
        </section>
      )}

      <div className="pipeline-source-banner">
        <div>
          <span className="section-label">FONTE PILOTO</span>
          <strong>Funding & Tenders Portal</strong>
          <p>{pilotItems.length} oportunidades sincronizadas · {report.summary.open} abertas · {report.summary.planned} previstas</p>
        </div>
        <div className="pipeline-source-state">
          <span>Última execução</span>
          <strong>{timeAgo(lastRunAt)}</strong>
          <small>{lastRunAt ? formatDate(lastRunAt) : "Ainda sem execução"}</small>
        </div>
      </div>

      <div className="pipeline-stats">
        <article><strong>{report.summary.discovered}</strong><span>Discovery</span><small>Itens encontrados na fonte</small></article>
        <article><strong>{report.summary.validated}</strong><span>Validation</span><small>{report.summary.discovered - report.summary.validated} com bloqueios</small></article>
        <article><strong>{report.summary.enriched}</strong><span>Enrichment</span><small>Clusters e audiência calculados</small></article>
        <article><strong>{approvedCount}</strong><span>Editorial Review</span><small>{reviewCount} em revisão · {holdCount} em espera</small></article>
        <article><strong>{published.length}</strong><span>Publication</span><small>{readyToPublish} pronto(s) para publicar</small></article>
      </div>

      <div className="pipeline-stage-strip">
        {([
          ["Discovery", report.summary.discovered],
          ["Validation", report.summary.validated],
          ["Enrichment", report.summary.enriched],
          ["Editorial Review", approvedCount + reviewCount + holdCount],
          ["Publication", published.length],
        ] as const).map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="pipeline-toolbar">
        <div className="search-box">
          <span>⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar por título, código, programa, grupo, investigador..." />
        </div>
        <div className="filter-row compact">
          <button className={`chip ${stateFilter === "Todos" ? "active" : ""}`} onClick={() => setStateFilter("Todos")}>Todos</button>
          <button className={`chip ${stateFilter === "Aberta" ? "active" : ""}`} onClick={() => setStateFilter("Aberta")}>Abertas</button>
          <button className={`chip ${stateFilter === "Prevista" ? "active" : ""}`} onClick={() => setStateFilter("Prevista")}>Previstas</button>
        </div>
      </div>

      <div className="pipeline-layout">
        <section className="pipeline-list panel">
          <div className="panel-heading">
            <div>
              <span className="section-label">DISCOVERY · CANDIDATOS</span>
              <h2>{visibleCandidates.length} oportunidades visíveis</h2>
            </div>
            <Badge tone={visibleCandidates.length ? "good" : "warn"}>{visibleCandidates.length ? "Cobertura ativa" : "Sem resultados"}</Badge>
          </div>

          <div className="pipeline-list-body">
            {visibleCandidates.map((candidate) => {
              const currentDecision = decisions[candidate.item.id] ?? candidate.editorial.status;
              return (
                <button
                  key={candidate.item.id}
                  className={`pipeline-item ${selected?.item.id === candidate.item.id ? "selected" : ""}`}
                  onClick={() => setSelectedId(candidate.item.id)}
                >
                  <div className="pipeline-item-main">
                    <div className="pipeline-item-title">
                      <strong>{candidate.item.name}</strong>
                      <small>{candidate.item.code} · {candidate.item.program}</small>
                    </div>
                    <div className="pipeline-item-meta">
                      <Badge tone={candidate.item.state === "Aberta" ? "good" : "warn"}>{candidate.item.state}</Badge>
                      <Badge tone={decisionTone[currentDecision]}>{currentDecision === "approved" ? "Aprovado" : currentDecision === "review" ? "Rever" : "Segurar"}</Badge>
                    </div>
                  </div>
                  <div className="pipeline-item-footer">
                    <span>{candidate.item.deadline}</span>
                    <strong>{candidate.confidence}%</strong>
                  </div>
                  <ConfidenceBar value={candidate.confidence} />
                </button>
              );
            })}
          </div>
        </section>

        <section className="pipeline-detail panel">
          {selected ? (
            <>
              <div className="panel-heading">
                <div>
                  <span className="section-label">EDITORIAL REVIEW</span>
                  <h2>{selected.item.name}</h2>
                </div>
                <div className="pipeline-detail-actions">
                  <Badge tone={selected.validation.status === "pass" ? "good" : selected.validation.status === "review" ? "warn" : "neutral"}>
                    {selected.validation.status === "pass" ? "Validation pass" : selected.validation.status === "review" ? "Validation review" : "Validation block"}
                  </Badge>
                  <Badge tone={decisionTone[decisions[selected.item.id] ?? selected.editorial.status] ?? "neutral"}>
                    {decisions[selected.item.id] ?? selected.editorial.status}
                  </Badge>
                </div>
              </div>

              <div className="pipeline-kpis">
                <div><small>Confidence</small><strong>{selected.confidence}%</strong></div>
                <div><small>Stage</small><strong>{selected.stage["Editorial Review"].label}</strong></div>
                <div><small>Publicação</small><strong>{selected.publication.status === "published" ? "Publicado" : "Pendente"}</strong></div>
              </div>

              <div className="pipeline-snapshot">
                <div><small>Programa</small><strong>{selected.item.program}</strong></div>
                <div><small>Estado</small><strong>{selected.item.state}</strong></div>
                <div><small>Deadline</small><strong>{selected.item.deadline}</strong></div>
                <div><small>Grupo IT</small><strong>{selected.item.group || "A validar"}</strong></div>
                <div><small>Audiência</small><strong>{selected.enrichment.recommendedAudience}</strong></div>
                <div><small>Ação</small><strong>{selected.enrichment.recommendedAction}</strong></div>
              </div>

              <div className="pipeline-review">
                <div className="review-control">
                  <button className={decisions[selected.item.id] === "approved" ? "active" : ""} onClick={() => updateDecision(selected.item.id, "approved")}>Aprovar</button>
                  <button className={decisions[selected.item.id] === "review" ? "active" : ""} onClick={() => updateDecision(selected.item.id, "review")}>Rever</button>
                  <button className={decisions[selected.item.id] === "hold" ? "active" : ""} onClick={() => updateDecision(selected.item.id, "hold")}>Segurar</button>
                </div>
                <label className="note-editor">
                  <span>Nota editorial</span>
                  <textarea
                    value={notes[selected.item.id] ?? selected.editorial.note}
                    onChange={(event) => setNotes((current) => ({ ...current, [selected.item.id]: event.target.value }))}
                    placeholder="Registar contexto, dúvida ou condição para publicação."
                  />
                </label>
              </div>

              <div className="diff-viewer">
                <div className="panel-heading">
                  <div>
                    <span className="section-label">DIFF VIEWER</span>
                    <h2>O que muda antes da publicação?</h2>
                  </div>
                  <Badge tone={selected.confidence >= 85 ? "good" : "warn"}>{selected.confidence}% confiança</Badge>
                </div>
                <div className="diff-list">
                  {selected.diffs.map((diff) => (
                    <div className="diff-row" key={diff.field}>
                      <div>
                        <strong>{diff.field}</strong>
                        <small>{diff.reason}</small>
                      </div>
                      <div><span>Antes</span><p>{diff.before}</p></div>
                      <div><span>Depois</span><p>{diff.after}</p></div>
                      <Badge tone={diff.confidence >= 85 ? "good" : diff.confidence >= 70 ? "warn" : "neutral"}>{diff.confidence}%</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pipeline-validation">
                <div>
                  <span className="section-label">VALIDATION</span>
                  <h3>{selected.validation.blockingIssues.length ? "Bloqueios detetados" : "Sem bloqueios críticos"}</h3>
                </div>
                <ul>
                  {selected.validation.blockingIssues.length
                    ? selected.validation.blockingIssues.map((issue) => <li key={issue}>{issue}</li>)
                    : selected.validation.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              </div>
            </>
          ) : (
            <div className="no-results">Selecione uma oportunidade para ver validação, enriquecimento, diff e publicação.</div>
          )}
        </section>
      </div>

      <div className="pipeline-publication">
        <div className="panel-heading">
          <div>
            <span className="section-label">PUBLICATION</span>
            <h2>Registo local do piloto</h2>
          </div>
          <Badge tone={published.length ? "good" : "neutral"}>{published.length} registos</Badge>
        </div>
        <div className="publication-log">
          {published.length ? (
            published
              .slice()
              .reverse()
              .map((entry) => (
                <div key={`${entry.itemId}-${entry.publishedAt}`} className="publication-entry">
                  <strong>{entry.name}</strong>
                  <span>{entry.itemId} · {entry.confidence}% · {entry.mode === "apply" ? "Apply" : "Dry Run"}</span>
                  <small>{formatDate(entry.publishedAt)}</small>
                </div>
              ))
          ) : (
            <div className="no-results">Ainda não há publicações. Execute Apply para gravar apenas os itens aprovados.</div>
          )}
        </div>
      </div>
    </div>
  );
}
