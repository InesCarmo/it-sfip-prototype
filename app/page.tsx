"use client";

import { useEffect, useMemo, useState } from "react";
import { coreEngine, type Opportunity, type WorkspaceContext } from "@/lib/core-engine";
import { analyzeIdea, type IdeaAnalysis } from "@/lib/ai-workspace-assistant";
import { type WeeklyBriefing } from "@/lib/sfip-autonomy";
import { FundingTendersPipelineScreen } from "@/components/funding-tenders-pipeline-screen";
import { ensureScheduledPipeline } from "@/lib/sfip-scheduler";
import { loadSchedulerState, type StoredSchedulerState } from "@/lib/sfip-scheduler-store";
import { loadSfipState, saveSfipState } from "@/lib/sfip-state-store";
import type { Mission } from "@/lib/sfip-types";

const missions: { id: Mission; label: string; glyph: string }[] = [
  { id: "home", label: "InÃ­cio", glyph: "âŒ’" },
  { id: "opportunities", label: "Oportunidades", glyph: "â–¦" },
  { id: "discover", label: "Descobrir", glyph: "â—Ž" },
  { id: "decide", label: "Decidir", glyph: "â—‡" },
  { id: "communicate", label: "Comunicar", glyph: "â–·" },
  { id: "track", label: "Acompanhar", glyph: "â˜‘" },
  { id: "intelligence", label: "InteligÃªncia", glyph: "âˆ´" },
];

missions.push({ id: "pipeline", label: "Pipeline", glyph: "âŸ³" });

const opportunities = coreEngine.getAllOpportunities(true);
const defaultWorkspace: WorkspaceContext = { title: "AnÃ¡lise atual", description: "" };
const initialTasks = coreEngine.getActions();
const APP_VERSION = "v0.10.3";
const APP_COMMIT = "ec841d4";
const APP_BUILD = "2026-08-10 14:30";

function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}

function formatCompactTimestamp(value: string | null | undefined) {
  if (!value) return "Por confirmar";
  try {
    return new Intl.DateTimeFormat("pt-PT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function OpportunityCard({ item, selected, onSelect, onOpen }: { item: Opportunity; selected: boolean; onSelect: () => void; onOpen: () => void }) {
  return (
    <article className={`opportunity-card ${selected ? "selected" : ""}`}>
      <div className="card-kicker"><Tag tone={item.tone}>{item.fit}</Tag><span>{item.deadline}</span></div>
      <h3>{item.name}</h3>
      <p><strong>PorquÃª:</strong> {item.why}</p>
      <p><strong>CondiÃ§Ã£o:</strong> {item.condition}</p>
      <div className="card-actions">
        <button className="button secondary" onClick={onOpen}>Ver evidÃªncia</button>
        <button className="button" onClick={onSelect}>{selected ? "Na shortlist" : "Adicionar"}</button>
      </div>
    </article>
  );
}

async function readIdeaFile(file: File) {
  const baseText = await file.text();
  if (/pdf$/i.test(file.name) || /pdf/i.test(file.type)) {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const ascii = Array.from(bytes)
        .map((value) => (value >= 32 && value <= 126 ? String.fromCharCode(value) : " "))
        .join("")
        .replace(/\s+/g, " ")
        .trim();
      if (ascii.length > baseText.trim().length) return ascii;
    } catch {
      return baseText;
    }
  }
  return baseText;
}

export default function Home() {
  const [mission, setMission] = useState<Mission>("home");
  const [workspace, setWorkspace] = useState<WorkspaceContext>(defaultWorkspace);
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [detail, setDetail] = useState<typeof opportunities[number] | null>(null);
  const [recommendation, setRecommendation] = useState("");
  const [decisionValidated, setDecisionValidated] = useState(false);
  const [drafted, setDrafted] = useState(false);
  const [sent, setSent] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [assistantInput, setAssistantInput] = useState("");
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [assistantReply, setAssistantReply] = useState("Descreva a ideia ou faÃ§a uma pergunta sobre o Workspace ativo.");
  const [stateLoaded, setStateLoaded] = useState(false);
  const [weeklyBriefing, setWeeklyBriefing] = useState<WeeklyBriefing | null>(null);
  const [schedulerState, setSchedulerState] = useState<StoredSchedulerState | null>(null);
  const [ideaInput, setIdeaInput] = useState("");
  const [ideaSourceLabel, setIdeaSourceLabel] = useState("Texto livre");
  const [ideaAnalysis, setIdeaAnalysis] = useState<IdeaAnalysis | null>(null);
  const activeWorkspace = workspace;
  const shortlistItems = useMemo(() => opportunities.filter((item) => shortlist.includes(item.id)), [shortlist]);

  useEffect(() => {
    const saved = loadSfipState(window.localStorage);
    if (saved) {
      setMission(saved.mission);
      setWorkspace(saved.workspace);
      setShortlist(saved.shortlist);
      setRecommendation(saved.recommendation);
      setDecisionValidated(saved.decisionValidated);
      setDrafted(saved.drafted);
      setSent(saved.sent);
      setTasks(saved.tasks);
      setAssistantOpen(saved.assistantOpen);
      setAssistantInput(saved.assistantInput);
      setAssistantReply(saved.assistantReply);
      if (saved.aiWorkspaceAssistant) {
        setIdeaInput(saved.aiWorkspaceAssistant.input);
        setIdeaSourceLabel(saved.aiWorkspaceAssistant.sourceLabel);
        setIdeaAnalysis(saved.aiWorkspaceAssistant.analysis as IdeaAnalysis | null);
      }
    }
    setStateLoaded(true);
  }, []);

  useEffect(() => {
    if (!stateLoaded) return;
    setSchedulerState(loadSchedulerState(window.localStorage));
    const scheduler = ensureScheduledPipeline(window.localStorage);
    setSchedulerState(scheduler.state);
    setWeeklyBriefing(scheduler.briefing);
    const interval = window.setInterval(() => {
      const refreshed = ensureScheduledPipeline(window.localStorage);
      setSchedulerState(refreshed.state);
      setWeeklyBriefing(refreshed.briefing);
    }, 15 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [stateLoaded]);

  useEffect(() => {
    if (!stateLoaded) return;
    saveSfipState(window.localStorage, {
      mission, workspace, shortlist, recommendation, decisionValidated, drafted, sent, tasks,
      assistantOpen, assistantInput, assistantReply,
      aiWorkspaceAssistant: ideaAnalysis ? { sourceLabel: ideaSourceLabel, input: ideaInput, analysis: ideaAnalysis } : null,
    });
  }, [stateLoaded, mission, workspace, shortlist, recommendation, decisionValidated, drafted, sent, tasks, assistantOpen, assistantInput, assistantReply, ideaAnalysis, ideaInput, ideaSourceLabel]);

  const navigate = (next: Mission) => { setMission(next); setDetail(null); };
  const askAssistant = () => {
    if (!assistantInput.trim()) return;
    setAssistantReply(coreEngine.answerAssistant(assistantInput, workspace));
    setAssistantInput("");
  };

  return (
    <main className={`app-shell ${assistantOpen ? "assistant-visible" : ""}`}>
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">IT</span><div><strong>SFIP</strong><small>Funding Intelligence</small></div></div>
        <nav aria-label="MissÃµes">
          <div className="nav-label">MISSÃ•ES</div>
          {missions.map((item) => (
            <button key={item.id} className={mission === item.id ? "active" : ""} onClick={() => navigate(item.id)}>
              <span>{item.glyph}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="nav-label">UTILITÃRIOS</div>
        <button className="utility" onClick={() => setGlobalSearchOpen(true)}><span>âŒ•</span>Pesquisa global</button>
        <button className="utility"><span>âš™</span>Settings</button>
        <div className="user"><span>IC</span><div><strong>InÃªs Carmo</strong><small>Pre-award manager</small></div></div>
      </aside>

      <section className="main-column">
        <header className="topbar">
          <div className="workspace-switcher">
            <button className="workspace-button" onClick={() => navigate("discover")}>
              <span className="workspace-dot blue" />
              <span><small>WORKSPACE ATIVO</small><strong>{activeWorkspace.title}</strong></span>
            </button>
          </div>
          <div className="workspace-meta">{activeWorkspace.area || "Ãrea por definir"} Â· ResponsÃ¡vel: InÃªs Carmo</div>
          <button className="assistant-toggle" onClick={() => setAssistantOpen(!assistantOpen)}>âœ¦ Assistant</button>
        </header>

        <div className="content">
          {mission === "home" && <HomeScreen navigate={navigate} briefing={weeklyBriefing} />}
          {mission === "opportunities" && <OpportunitiesScreen setDetail={setDetail} navigate={navigate} setGlobalSearchOpen={setGlobalSearchOpen} />}
          {mission === "discover" && <DiscoverScreen workspace={workspace} setWorkspace={setWorkspace} shortlist={shortlist} setShortlist={setShortlist} setDetail={setDetail} navigate={navigate} ideaInput={ideaInput} setIdeaInput={setIdeaInput} ideaSourceLabel={ideaSourceLabel} setIdeaSourceLabel={setIdeaSourceLabel} ideaAnalysis={ideaAnalysis} setIdeaAnalysis={setIdeaAnalysis} setRecommendation={setRecommendation} setAssistantReply={setAssistantReply} setDecisionValidated={setDecisionValidated} setDrafted={setDrafted} setSent={setSent} />}
          {mission === "decide" && <DecideScreen items={shortlistItems} recommendation={recommendation} setRecommendation={setRecommendation} validated={decisionValidated} setValidated={setDecisionValidated} navigate={navigate} />}
          {mission === "communicate" && <CommunicateScreen drafted={drafted} setDrafted={setDrafted} sent={sent} setSent={setSent} navigate={navigate} />}
          {mission === "track" && <TrackScreen tasks={tasks} setTasks={setTasks} />}
          {mission === "intelligence" && <IntelligenceScreen navigate={navigate} />}
          {mission === "pipeline" && <FundingTendersPipelineScreen navigate={navigate} schedulerState={schedulerState} />}
        </div>

        <footer className="app-footer">
          <span><strong>SFIP {APP_VERSION}</strong></span>
          <span>Commit: {APP_COMMIT}</span>
          <span>Build: {APP_BUILD}</span>
          <span>Snapshot: {formatCompactTimestamp(weeklyBriefing?.generatedAt)}</span>
          <span>Pipeline: {weeklyBriefing ? "OK" : "A validar"}</span>
        </footer>

      </section>

      {assistantOpen && (
        <aside className="assistant-panel">
            <div className="assistant-header"><div><span className="spark">âœ¦</span><strong>Funding Intelligence</strong><small>Contexto: {activeWorkspace.title}</small></div><button onClick={() => setAssistantOpen(false)}>Ã—</button></div>
          <div className="assistant-body">
            <div className="assistant-status"><span className="pulse" />Contexto atualizado</div>
            <div className="assistant-message">{assistantReply}</div>
            <div className="evidence-box"><strong>EvidÃªncia utilizada</strong><span>{coreEngine.meta.counts.calls} calls</span><span>{coreEngine.meta.counts.researchers} perfis internos</span><span>{coreEngine.meta.counts.matching} relaÃ§Ãµes de matching</span></div>
            <div className="assistant-prompts">
              <button onClick={() => { setAssistantInput("Qual Ã© a melhor oportunidade?"); }}>Qual Ã© a melhor opÃ§Ã£o?</button>
              <button onClick={() => { setAssistantInput("Que parceiros faltam?"); }}>Que parceiros faltam?</button>
              <button onClick={() => navigate("communicate")}>Preparar uma resposta</button>
            </div>
          </div>
          <div className="assistant-input"><textarea value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); askAssistant(); } }} placeholder="Pergunte sobre este Workspace..." /><button onClick={askAssistant}>â†‘</button></div>
        </aside>
      )}

      {detail && <DetailDrawer item={detail} onClose={() => setDetail(null)} onDecide={() => { if (!shortlist.includes(detail.id)) setShortlist([...shortlist, detail.id]); setDetail(null); navigate("decide"); }} />}
      {globalSearchOpen && <GlobalSearch onClose={() => setGlobalSearchOpen(false)} onOpen={(item) => { setGlobalSearchOpen(false); setDetail(item); }} />}
    </main>
  );
}

function ScreenTitle({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: string; subtitle: string; actions?: React.ReactNode }) {
  return <div className="screen-title"><div><span>{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{actions && <div className="title-actions">{actions}</div>}</div>;
}

function HomeScreen({ navigate, briefing }: { navigate: (m: Mission) => void; briefing: WeeklyBriefing | null }) {
  const calls = coreEngine.getAllOpportunities();
  const open = calls.filter(item => item.state === "Aberta");
  const expected = calls.filter(item => item.state === "Prevista");
  const urgent = open.filter(item => item.days !== null && item.days >= 0 && item.days <= 30).sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
  const highPriority = calls.filter(item => /estratÃ©gica|alta/i.test(`${item.priority} ${item.fit}`));
  const radar = coreEngine.getAllOpportunities(true).filter(item => item.source === "RADAR");
  return <>
    <ScreenTitle eyebrow="FONTE ATUALIZADA" title="Bom dia, InÃªs." subtitle={`${coreEngine.meta.counts.calls} calls sincronizadas a partir de ${coreEngine.meta.sourceWorkbook}.`} actions={<button className="button" onClick={() => navigate("discover")}>+ Novo pedido</button>} />
    <div className="command-box"><span>âœ¦</span><input placeholder="Pesquise uma call ou descreva um pedido de investigador..." onKeyDown={(e) => { if (e.key === "Enter") navigate("discover"); }} /><button onClick={() => navigate("discover")}>â†’</button></div>
    <div className="briefing-grid">
      <button className="brief-card urgent" onClick={() => navigate("opportunities")}><strong>{urgent.length}</strong><span>Fecham â‰¤30 dias</span><small>Calls abertas</small></button>
      <button className="brief-card" onClick={() => navigate("opportunities")}><strong>{open.length}</strong><span>Calls abertas</span><small>{expected.length} previstas</small></button>
      <button className="brief-card" onClick={() => navigate("discover")}><strong>{highPriority.length}</strong><span>Prioridade elevada</span><small>Baseado na relevÃ¢ncia registada</small></button>
      <button className="brief-card" onClick={() => navigate("intelligence")}><strong>{radar.length}</strong><span>Radar</span><small>Oportunidades a monitorizar</small></button>
    </div>
    <div className="home-columns">
      <section className="panel"><div className="panel-heading"><div><span className="section-label">REQUER ATENÃ‡ÃƒO</span><h2>PrÃ³ximas decisÃµes</h2></div><button onClick={() => navigate("track")}>Ver todas</button></div>
        <div className="attention-list">
          {urgent.slice(0, 3).map(item => <button key={item.id} onClick={() => navigate("opportunities")}><span className="attention-icon">{item.id.replace("CALL-", "")}</span><div><strong>{item.name}</strong><small>{item.program} Â· {item.action || "Rever oportunidade"}</small></div><Tag tone="warn">{item.days} dias</Tag></button>)}
        </div>

      </section>
      <section className="panel"><div className="panel-heading"><div><span className="section-label">ðŸ“¬ FUNDING INTELLIGENCE</span><h2>Briefing semanal</h2></div><button onClick={() => navigate("track")}>Validar</button></div>
        <div className="weekly-briefing">
          <div className="weekly-metrics">
            <article><strong>{briefing?.summary.newCount ?? 0}</strong><span>novas oportunidades</span></article>
            <article><strong>{briefing?.summary.changedDeadlinesCount ?? 0}</strong><span>deadlines alteradas</span></article>
            <article><strong>{briefing?.summary.webinarCount ?? 0}</strong><span>webinars</span></article>
            <article><strong>{briefing?.summary.brokerageCount ?? 0}</strong><span>brokerage events</span></article>
          </div>
          <div className="weekly-highlights">
            <strong>O que mudou desde a semana passada?</strong>
            <ul>
              <li>{briefing?.summary.newCount ?? 0} novas oportunidades sincronizadas.</li>
              <li>{briefing?.summary.changedDeadlinesCount ?? 0} deadlines foram recalculadas automaticamente.</li>
              <li>{briefing?.summary.closedCount ?? 0} oportunidades passaram a encerradas.</li>
            </ul>
            <div className="weekly-tags">
              <Tag tone="good">Power Systems Â· {coreEngine.getByGroup("Power Electronics").filter((item) => item.state === "Aberta").length}</Tag>
              <Tag tone="warn">PIA Â· {coreEngine.getByGroup("Pattern and Image Analysis").filter((item) => item.state === "Aberta").length}</Tag>
              <Tag tone="warn">MSP Â· {coreEngine.getByGroup("Multimedia Signal Processing").filter((item) => item.state === "Aberta").length}</Tag>
            </div>
          </div>
        </div>
        <div className="briefing-queue">
          {(briefing?.newOpportunities ?? []).slice(0, 3).map((item) => <button key={item.id} onClick={() => navigate("opportunities")}><span>{item.id.replace("CALL-", "")}</span><div><strong>{item.name}</strong><small>{item.program}</small></div></button>)}
          {(briefing?.webinars ?? []).slice(0, 2).map((item) => <button key={item.id} onClick={() => navigate("communicate")}><span>web</span><div><strong>{item.name}</strong><small>Webinar</small></div></button>)}
          {(briefing?.brokerageEvents ?? []).slice(0, 2).map((item) => <button key={item.id} onClick={() => navigate("communicate")}><span>brk</span><div><strong>{item.name}</strong><small>Brokerage event</small></div></button>)}
        </div>
      </section>
      <section className="panel"><div className="panel-heading"><div><span className="section-label">A MINHA ATIVIDADE</span><h2>ComunicaÃ§Ãµes e sinais</h2></div><button onClick={() => navigate("communicate")}>Ver comunicaÃ§Ãµes</button></div>
        {radar.slice(0, 2).map(item => <div className="signal" key={item.id}><span>â†—</span><div><strong>{item.name}</strong><p>{item.why}</p><button onClick={() => navigate("intelligence")}>Ver no Radar â†’</button></div></div>)}
      </section>
    </div>
  </>;
}

function OpportunitiesScreen({ setDetail, navigate, setGlobalSearchOpen }: { setDetail: (v: typeof opportunities[number]) => void; navigate: (m: Mission) => void; setGlobalSearchOpen: (v: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState("Todos");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const filtered = coreEngine.searchGlobal(query, { state, source: "CALLS" }).sort((a, b) => (a.days ?? 99999) - (b.days ?? 99999));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  return <>
    <ScreenTitle eyebrow="EXPLORAÃ‡ÃƒO LIVRE" title="Oportunidades" subtitle="Navegue em todas as calls, independentemente de um Workspace." actions={<><button className="button secondary" onClick={() => setGlobalSearchOpen(true)}>Filtros avanÃ§ados</button><button className="button" onClick={() => navigate("discover")}>Analisar um pedido</button></>} />
    <div className="library-toolbar"><div className="search-box"><span>âŒ•</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar por call, cÃ³digo, programa, Ã¡rea ou grupo..." /></div><select value={state} onChange={e => setState(e.target.value)}><option>Todos</option><option>Aberta</option><option>Prevista</option></select></div>
    <div className="saved-views"><span>Vistas rÃ¡pidas</span><button onClick={() => { setState("Aberta"); setPage(1); }}>Abertas</button><button onClick={() => { setState("Prevista"); setPage(1); }}>Previstas</button></div>
    <section className="opportunity-table"><header><span>Oportunidade</span><span>Programa</span><span>Tipo</span><span>Estado</span><span>Deadline</span><span>Grupo IT</span></header>{visible.map(item => <button key={item.id} onClick={() => setDetail(item)}><span><strong>{item.name}</strong><small>{item.code} Â· {item.area}</small></span><span>{item.program}</span><span>{item.type}</span><span><Tag tone={item.state === "Aberta" ? "good" : "warn"}>{item.state}</Tag></span><span><strong>{item.deadline}</strong><small>{item.days !== null && item.days < 900 ? `${item.days} dias` : "ContÃ­nua"}</small></span><span>{item.group}</span></button>)}</section>
    <div className="table-footer"><span>A mostrar {visible.length} de {filtered.length} oportunidades Â· pÃ¡gina {page}/{pageCount}</span><button disabled={page === 1} onClick={() => setPage(page - 1)}>â†</button><button disabled={page === pageCount} onClick={() => setPage(page + 1)}>â†’</button></div>
  </>;
}

function DiscoverScreen({
  workspace,
  setWorkspace,
  shortlist,
  setShortlist,
  setDetail,
  navigate,
  ideaInput,
  setIdeaInput,
  ideaSourceLabel,
  setIdeaSourceLabel,
  ideaAnalysis,
  setIdeaAnalysis,
  setRecommendation,
  setAssistantReply,
  setDecisionValidated,
  setDrafted,
  setSent,
}: {
  workspace: WorkspaceContext;
  setWorkspace: (v: WorkspaceContext) => void;
  shortlist: string[];
  setShortlist: (v: string[]) => void;
  setDetail: (v: Opportunity) => void;
  navigate: (m: Mission) => void;
  ideaInput: string;
  setIdeaInput: (v: string) => void;
  ideaSourceLabel: string;
  setIdeaSourceLabel: (v: string) => void;
  ideaAnalysis: IdeaAnalysis | null;
  setIdeaAnalysis: (v: IdeaAnalysis | null) => void;
  setRecommendation: (v: string) => void;
  setAssistantReply: (v: string) => void;
  setDecisionValidated: (v: boolean) => void;
  setDrafted: (v: boolean) => void;
  setSent: (v: boolean) => void;
}) {
  const [localQuery, setLocalQuery] = useState(ideaInput || workspace.description);
  const analysis = ideaAnalysis;
  const fallbackRecommendations = coreEngine.getContextualRecommendations({ ...workspace, description: localQuery }, 8);
  const recommendations = analysis?.recommendations ?? fallbackRecommendations.map(({ item, score }) => ({
    item,
    score,
    matchedKeywords: [],
    matchedSignals: [],
    explainWhy: item.why || "Apareceu porque o Workspace atual Ã© compatÃ­vel com esta oportunidade.",
    nextSteps: [
      item.state === "Aberta" ? "Rever a elegibilidade e preparar a resposta." : "Monitorizar a abertura ou a evoluÃ§Ã£o desta oportunidade.",
      item.partnerRequired === "Sim" ? "Confirmar parceiro ou consÃ³rcio necessÃ¡rio." : "Validar o enquadramento com o coordenador do grupo.",
    ],
  }));

  const handleAnalyze = async (text?: string, sourceLabel = ideaSourceLabel) => {
    const sourceText = (text ?? localQuery).trim();
    if (!sourceText) return;
    const nextAnalysis = analyzeIdea(sourceText, sourceLabel);
    setIdeaInput(sourceText);
    setIdeaSourceLabel(sourceLabel);
    setIdeaAnalysis(nextAnalysis);
    setWorkspace({ ...nextAnalysis.workspace, description: sourceText, title: nextAnalysis.titleSuggestion });
    setShortlist(nextAnalysis.shortlist);
    setRecommendation(nextAnalysis.shortlist[0] ?? '');
    setDecisionValidated(false);
    setDrafted(false);
    setSent(false);
    setAssistantReply(nextAnalysis.responseToResearcher);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await readIdeaFile(file);
    setIdeaSourceLabel(file.name);
    setLocalQuery(text);
    await handleAnalyze(text, file.name);
    event.target.value = '';
  };

  const currentWorkspace = analysis?.workspace ?? workspace;

  return <>
    <ScreenTitle
      eyebrow="AI WORKSPACE ASSISTANT"
      title="Transformar uma ideia num Workspace"
      subtitle="Comece pelo texto, email ou PDF. A SFIP analisa a ideia, cria o Workspace e devolve uma shortlist fundamentada."
      actions={<><button className="button secondary" onClick={() => navigate('opportunities')}>Explorar toda a base</button><button className="button secondary" onClick={() => navigate('decide')}>Shortlist <span className="count">{shortlist.length}</span></button></>}
    />
    <section className="idea-assistant-panel">
      <div className="idea-ingest">
        <div className="panel-heading">
          <div>
            <span className="section-label">1 Â· ENTRADA</span>
            <h2>Colar ideia, email ou carregar PDF</h2>
          </div>
          <div className="idea-source">
            <Tag tone="neutral">{ideaSourceLabel}</Tag>
            <input type="file" accept=".txt,.eml,.pdf,text/plain,message/rfc822,application/pdf" onChange={handleUpload} />
          </div>
        </div>
        <textarea className="idea-textarea" value={localQuery} onChange={(e) => setLocalQuery(e.target.value)} placeholder="Ex.: queremos explorar IA aplicada Ã  saÃºde com dados clÃ­nicos e parceiros hospitalares..." />
        <div className="idea-actions">
          <button className="button secondary" onClick={() => { setLocalQuery(''); setIdeaInput(''); setIdeaAnalysis(null); }}>Limpar</button>
          <button className="button" onClick={() => handleAnalyze(localQuery, ideaSourceLabel)}>Analisar ideia</button>
        </div>
      </div>

      <div className="idea-analysis">
        <div className="panel-heading">
          <div>
            <span className="section-label">2 Â· ANÃLISE AUTOMÃTICA</span>
            <h2>{analysis ? analysis.titleSuggestion : 'Sem anÃ¡lise ainda'}</h2>
          </div>
          <Tag tone={analysis ? 'good' : 'warn'}>{analysis ? `${analysis.confidence}% confianÃ§a` : 'A validar'}</Tag>
        </div>
        <div className="idea-summary">
          <div><small>RESUMO</small><strong>{analysis?.summary ?? 'A anÃ¡lise vai gerar um resumo acionÃ¡vel e editÃ¡vel.'}</strong></div>
          <div><small>ÃREA / TECNOLOGIA</small><strong>{analysis ? `${analysis.area} Â· ${analysis.technologyDomain}` : 'Por validar'}</strong></div>
          <div><small>PROGRAMA / TRL</small><strong>{analysis ? `${analysis.probableProgram} Â· ${analysis.maturity}` : 'Por validar'}</strong></div>
          <div><small>TIPO / ENTIDADES</small><strong>{analysis ? `${analysis.type} Â· ${analysis.entities.slice(0, 3).join('; ') || 'Por validar'}` : 'Por validar'}</strong></div>
        </div>
        <div className="idea-meta-grid">
          <div><small>PALAVRAS-CHAVE</small><strong>{analysis?.keywords.join('; ') || 'Por validar'}</strong></div>
          <div><small>GRUPOS IT</small><strong>{analysis?.suggestedGroups.join('; ') || 'A validar com o coordenador do grupo'}</strong></div>
          <div><small>INVESTIGADORES</small><strong>{analysis?.suggestedResearchers.join('; ') || 'A validar com o coordenador do grupo'}</strong></div>
          <div><small>VALIDAÃ‡ÃƒO</small><strong>{analysis?.validationFlags.join('; ') || 'Sem bloqueios crÃ­ticos'}</strong></div>
        </div>
        <div className="idea-export">
          <div>
            <small>RESPOSTA AO INVESTIGADOR</small>
            <p>{analysis?.responseToResearcher ?? 'A resposta serÃ¡ gerada apÃ³s a anÃ¡lise.'}</p>
          </div>
          <div>
            <small>RESUMO INTERNO</small>
            <p>{analysis?.internalSummary ?? 'A anÃ¡lise interna fica disponÃ­vel apÃ³s a criaÃ§Ã£o do Workspace.'}</p>
          </div>
          <div>
            <small>NOTAS DE REUNIÃƒO</small>
            <p>{analysis?.meetingNotes ?? 'Ainda nÃ£o hÃ¡ notas geradas.'}</p>
          </div>
        </div>
      </div>
    </section>

    <div className="context-evidence"><div><small>WORKSPACE</small><strong>{currentWorkspace.title}</strong></div><div><small>SINAIS CONSIDERADOS</small><strong>Texto Â· Ã¡rea Â· grupo Â· programa Â· investigador Â· empresa</strong></div><div><small>FONTE</small><strong>Knowledge Engine + tblCalls + tblMatching + tblRadar</strong></div></div>
    <div className="results-heading"><div><span className="section-label">3 Â· SHORTLIST FUNDAMENTADA</span><h2>{recommendations.length} oportunidades com evidÃªncia contextual</h2></div><div className="confidence"><span />Explain Why sempre visÃ­vel</div></div>
    <div className="opportunity-list">{recommendations.map(({ item, score, explainWhy, matchedKeywords = [], matchedSignals = [], nextSteps = [] }) => <div key={item.id} className="recommendation-block"><div className="recommendation-head"><div className="confidence">Score contextual: {score}</div><strong>Porque apareceu</strong><p>{explainWhy}</p><div className="recommendation-tags"><Tag tone={item.tone}>{item.fit}</Tag><Tag tone="neutral">{matchedKeywords.slice(0, 4).join('; ') || 'Sem coincidÃªncia forte'}</Tag><Tag tone="neutral">{matchedSignals.slice(0, 3).join('; ') || 'Sinais contextuais'}</Tag></div></div><OpportunityCard item={item} selected={shortlist.includes(item.id)} onOpen={() => setDetail(item)} onSelect={() => setShortlist(shortlist.includes(item.id) ? shortlist.filter(id => id !== item.id) : [...shortlist, item.id])} /><div className="next-steps-mini"><small>PRÃ“XIMOS PASSOS</small><ul>{nextSteps.slice(0, 3).map((step) => <li key={step}>{step}</li>)}</ul></div></div>)}</div>
  </>;
}
function DecideScreen({ items, recommendation, setRecommendation, validated, setValidated, navigate }: { items: Opportunity[]; recommendation: string; setRecommendation: (v: string) => void; validated: boolean; setValidated: (v: boolean) => void; navigate: (m: Mission) => void }) {
  const selected = items.find(item => item.id === recommendation) ?? items[0];
  return <>
    <ScreenTitle eyebrow="MISSÃƒO 02" title="Decidir" subtitle="Compare alternativas e registe uma recomendaÃ§Ã£o fundamentada." actions={<button className="button secondary">+ Adicionar opÃ§Ã£o</button>} />
    <div className="decision-summary"><div className="assistant-badge">âœ¦</div><div><span className="section-label">RECOMENDAÃ‡ÃƒO IT-SFIP</span><h2>{selected ? `Priorizar ${selected.name}` : "Adicione oportunidades Ã  shortlist em Descobrir."}</h2><p>{selected ? `${selected.fit}. ${selected.why}` : "A comparaÃ§Ã£o serÃ¡ construÃ­da exclusivamente com registos da base."}</p></div></div>
    <div className="comparison-grid">
      {items.map((item) => <article key={item.id} className={`compare-card ${recommendation === item.id ? "recommended" : ""}`}>
        <label><input type="radio" checked={recommendation === item.id} onChange={() => setRecommendation(item.id)} /> Selecionar</label>
        <Tag tone={item.tone}>{item.fit}</Tag><h3>{item.name}</h3><div className="deadline"><small>DEADLINE</small><strong>{item.deadline}</strong></div>
        <dl><div><dt>Potencial IT</dt><dd>{item.fit || "Por confirmar"}</dd></div><div><dt>ConsÃ³rcio</dt><dd>{item.condition || "Por confirmar"}</dd></div><div><dt>Investigadores</dt><dd>{item.researcher || "Sem matching validado"}</dd></div><div><dt>Prazo</dt><dd>{item.days === null ? "Por confirmar" : `${item.days} dias`}</dd></div></dl>
      </article>)}
    </div>
    <div className="decision-footer"><div><strong>{validated ? "DecisÃ£o validada" : "2 validaÃ§Ãµes pendentes"}</strong><span>{validated ? "Registada por InÃªs Martins" : "Elegibilidade nacional Â· disponibilidade do coordenador"}</span></div><button className="button secondary" onClick={() => setValidated(true)}>{validated ? "Validado âœ“" : "Pedir validaÃ§Ã£o"}</button><button className="button" onClick={() => navigate("communicate")}>Guardar e comunicar</button></div>
  </>;
}

function CommunicateScreen({ drafted, setDrafted, sent, setSent, navigate }: { drafted: boolean; setDrafted: (v: boolean) => void; sent: boolean; setSent: (v: boolean) => void; navigate: (m: Mission) => void }) {
  const [channel, setChannel] = useState("Email");
  const [segment, setSegment] = useState({ group: "Todos", researcher: "Todos", company: "Todas", program: "Todos", type: "Todos", state: "Aberta", deadline: "90", area: "Todas" });
  const setCriterion = (key: keyof typeof segment, value: string) => { setSegment({ ...segment, [key]: value }); setDrafted(false); setSent(false); };
  const eligible = coreEngine.selectForCommunication({ program: segment.program, area: segment.area, group: segment.group, researcher: segment.researcher, company: segment.company, type: segment.type, state: segment.state, deadlineDays: segment.deadline === "Qualquer" ? undefined : Number(segment.deadline) });
  const audienceNames = [...new Set(eligible.flatMap(item => item.researcher.split(";").map(value => value.trim()).filter(Boolean)))];
  const audienceCount = segment.researcher === "Todos" ? audienceNames.length : eligible.length ? 1 : 0;
  return <>
    <ScreenTitle eyebrow="MISSÃƒO 03 Â· DIVULGAÃ‡ÃƒO ESTRATÃ‰GICA" title="ComunicaÃ§Ã£o" subtitle="Construa uma audiÃªncia, selecione oportunidades elegÃ­veis e publique no canal adequado." actions={<button className="button secondary">As minhas campanhas</button>} />
    <div className="campaign-steps"><span className="active"><b>1</b>Segmento</span><i /><span className={eligible.length ? "active" : ""}><b>2</b>Oportunidades</span><i /><span className={drafted ? "active" : ""}><b>3</b>ConteÃºdo</span><i /><span className={sent ? "active" : ""}><b>4</b>PublicaÃ§Ã£o</span></div>
    <div className="campaign-builder">
      <aside className="segment-panel"><div className="panel-heading"><div><span className="section-label">1 Â· DEFINIR SEGMENTO</span><h2>Quem deve receber?</h2></div><button className="text-button" onClick={() => setSegment({ group:"Todos", researcher:"Todos", company:"Todas", program:"Todos", type:"Todos", state:"Todos", deadline:"Qualquer", area:"Todas" })}>Limpar</button></div><div className="segment-grid"><label>Grupo IT<select value={segment.group} onChange={e => setCriterion("group",e.target.value)}><option>Todos</option>{coreEngine.facets.groups.map(value => <option key={value}>{value}</option>)}</select></label><label>Investigador<select value={segment.researcher} onChange={e => setCriterion("researcher",e.target.value)}><option>Todos</option>{coreEngine.facets.researchers.map(value => <option key={value}>{value}</option>)}</select></label><label>Empresa / Entidade<select value={segment.company} onChange={e => setCriterion("company",e.target.value)}><option>Todas</option>{coreEngine.facets.companies.map(value => <option key={value}>{value}</option>)}</select></label><label>Programa<select value={segment.program} onChange={e => setCriterion("program",e.target.value)}><option>Todos</option>{coreEngine.facets.programs.map(value => <option key={value}>{value}</option>)}</select></label><label>Tipo de oportunidade<select value={segment.type} onChange={e => setCriterion("type",e.target.value)}><option>Todos</option>{coreEngine.facets.types.map(value => <option key={value}>{value}</option>)}</select></label><label>Estado<select value={segment.state} onChange={e => setCriterion("state",e.target.value)}><option>Todos</option>{coreEngine.facets.states.map(value => <option key={value}>{value}</option>)}</select></label><label>Prazo<select value={segment.deadline} onChange={e => setCriterion("deadline",e.target.value)}><option value="Qualquer">Qualquer</option><option value="30">â‰¤ 30 dias</option><option value="90">â‰¤ 90 dias</option><option value="180">â‰¤ 180 dias</option></select></label><label>Ãrea cientÃ­fica<select value={segment.area} onChange={e => setCriterion("area",e.target.value)}><option>Todas</option>{coreEngine.facets.areas.map(value => <option key={value}>{value}</option>)}</select></label></div><div className="audience-card"><div><small>AUDIÃŠNCIA CONSTRUÃDA AUTOMATICAMENTE</small><strong>{audienceCount} destinatÃ¡rios</strong><span>{audienceNames.slice(0, 3).join("; ") || "Sem matching para este segmento"}</span></div></div></aside>
      <section className="eligible-panel"><div className="panel-heading"><div><span className="section-label">2 Â· OPORTUNIDADES ELEGÃVEIS</span><h2>{eligible.length} selecionadas pelo segmento</h2></div><Tag tone={eligible.length ? "good" : "warn"}>{eligible.length ? "Coerente" : "Sem resultados"}</Tag></div>{eligible.length ? eligible.map(item => <label className="eligible-item" key={item.id}><input type="checkbox" defaultChecked /><span><small>{item.program} Â· {item.type}</small><strong>{item.name}</strong><em>{item.area} Â· Deadline {item.deadline}</em></span><Tag tone={item.state === "Aberta" ? "good" : "warn"}>{item.state}</Tag></label>) : <div className="no-results">Nenhuma oportunidade cumpre todos os critÃ©rios. Alargue o prazo ou remova um filtro.</div>}<button className="button wide" disabled={!eligible.length} onClick={() => setDrafted(true)}>Continuar para conteÃºdo â†’</button></section>
    </div>
    {drafted && <section className="channel-composer"><div className="channel-tabs"><span>3 Â· GERAR CONTEÃšDO</span>{["Email","Newsletter","Teams","LinkedIn"].map(item => <button key={item} className={channel === item ? "active" : ""} onClick={() => setChannel(item)}>{item}</button>)}</div><div className="composer-body"><div><small>PRÃ‰-VISUALIZAÃ‡ÃƒO Â· {channel.toUpperCase()}</small><h2>Oportunidades para {segment.group !== "Todos" ? segment.group : segment.area !== "Todas" ? segment.area : segment.program !== "Todos" ? segment.program : "o segmento selecionado"}</h2><p>SeleÃ§Ã£o automÃ¡tica de oportunidades com estado <strong>{segment.state}</strong>{segment.deadline !== "Qualquer" ? ` e prazo atÃ© ${segment.deadline} dias` : ""}.</p>{eligible.map(item => <div className="message-call" key={item.id}><strong>{item.name}</strong><span>{item.program} Â· {item.deadline}</span><p>{item.why}.</p></div>)}<p><strong>ManifestaÃ§Ã£o de interesse:</strong> contacte a equipa de pre-award para enquadramento e apoio Ã  identificaÃ§Ã£o de parceiros.</p></div><aside><strong>Controlos do canal</strong><label>Tom<select><option>Institucional e direto</option><option>Editorial</option><option>Breve e urgente</option></select></label><label>Remetente<select><option>InÃªs Carmo Â· Pre-award</option><option>IT Funding Radar</option></select></label><label><input type="checkbox" defaultChecked /> Incluir links oficiais</label><label><input type="checkbox" defaultChecked /> Incluir chamada Ã  aÃ§Ã£o</label><button className="button secondary wide">Regenerar conteÃºdo</button></aside></div></section>}
    {drafted && <div className="communication-footer"><div><Tag tone={sent ? "good" : "warn"}>{sent ? "PublicaÃ§Ã£o registada" : `${audienceCount} destinatÃ¡rios Â· ${eligible.length} oportunidades`}</Tag><span>Campanha de InÃªs Carmo Â· canal {channel}</span></div><button className="button secondary">Guardar rascunho</button><button className="button secondary">Agendar</button><button className="button" onClick={() => { setSent(true); setTimeout(() => navigate("track"), 600); }}>{sent ? "Publicada âœ“" : `Publicar em ${channel}`}</button></div>}
  </>;
}

function TrackScreen({ tasks, setTasks }: { tasks: typeof initialTasks; setTasks: (v: typeof initialTasks) => void }) {
  const [filter, setFilter] = useState("Todas");
  const visible = filter === "ConcluÃ­das" ? tasks.filter(t => t.done) : filter === "Em atraso" ? tasks.filter(t => !t.done && t.days !== null && t.days < 0) : tasks;
  return <>
    <ScreenTitle eyebrow="MISSÃƒO 04" title="Acompanhar" subtitle="Mantenha decisÃµes, validaÃ§Ãµes e deadlines em movimento." actions={<button className="button">+ Nova aÃ§Ã£o</button>} />
    <div className="filter-row"><button className={`chip ${filter === "Todas" ? "active" : ""}`} onClick={() => setFilter("Todas")}>Todas</button><button className={`chip ${filter === "Em atraso" ? "active" : ""}`} onClick={() => setFilter("Em atraso")}>Em atraso <b>2</b></button><button className="chip">A aguardar terceiros <b>3</b></button><button className={`chip ${filter === "ConcluÃ­das" ? "active" : ""}`} onClick={() => setFilter("ConcluÃ­das")}>ConcluÃ­das</button></div>
    <div className="tracking-layout"><section className="task-board"><div className="panel-heading"><div><span className="section-label">AÃ‡Ã•ES DA TBLCALLS</span><h2>Prioridades</h2></div><span>{visible.filter(t => !t.done).length} abertas</span></div>{visible.map(task => <label key={task.id} className={`task ${task.done ? "done" : ""}`}><input type="checkbox" checked={task.done} onChange={() => setTasks(tasks.map(t => t.id === task.id ? {...t, done: !t.done} : t))} /><span className="task-check">âœ“</span><div><strong>{task.label}</strong><small>{task.id} Â· {task.call}</small></div><Tag tone={task.days !== null && task.days <= 30 ? "warn" : "neutral"}>{task.due}</Tag></label>)}</section><aside className="risk-panel"><span className="section-label">QUALIDADE OPERACIONAL</span><div className="risk"><span>i</span><div><strong>Fonte de aÃ§Ãµes</strong><p>Campo AÃ§Ã£o Recomendada da tblCalls.</p></div></div><div className="risk"><span>!</span><div><strong>PersistÃªncia</strong><p>AlteraÃ§Ãµes locais ainda nÃ£o escrevem no Excel.</p></div></div></aside></div>
  </>;
}

function IntelligenceScreen({ navigate }: { navigate: (m: Mission) => void }) {
  const all = coreEngine.getAllOpportunities(true);
  const radar = all.filter(item => item.source === "RADAR");
  const coverage = coreEngine.facets.groups.map(group => ({ group, count: coreEngine.getByGroup(group).length })).sort((a, b) => b.count - a.count);
  const max = Math.max(...coverage.map(item => item.count), 1);
  return <>
    <ScreenTitle eyebrow="MISSÃƒO 05" title="InteligÃªncia" subtitle="Leitura agregada dos dados sincronizados da plataforma." />
    <div className="intelligence-hero"><div><span className="section-label">CORE DATA BRIEFING</span><h2>{coreEngine.meta.counts.calls} calls, {coreEngine.meta.counts.researchers} investigadores e {coreEngine.meta.counts.matching} relaÃ§Ãµes de matching disponÃ­veis.</h2><p>Fonte: {coreEngine.meta.sourceWorkbook}</p></div><div className="briefing-score"><strong>{radar.length}</strong><span>itens RADAR</span></div></div>
    <div className="insight-grid">{radar.slice(0, 3).map(item => <article className="insight-card" key={item.id}><div className="insight-icon">â†—</div><Tag tone="warn">Radar</Tag><h3>{item.name}</h3><p>{item.why}</p><div className="impact"><span>{item.program}</span><span>{item.fit}</span></div><button onClick={() => navigate("discover")}>Analisar no Workspace â†’</button></article>)}</div>
    <section className="coverage-panel"><div className="panel-heading"><div><span className="section-label">COBERTURA POR GRUPO</span><h2>Oportunidades associadas na base</h2></div></div>{coverage.map(item => <div className="coverage-row" key={item.group}><span>{item.group}</span><div className="bar"><i style={{width:`${Math.round(item.count / max * 100)}%`}} /></div><strong>{item.count}</strong><small>oportunidades</small></div>)}</section>
  </>;
}

function GlobalSearch({ onClose, onOpen }: { onClose: () => void; onOpen: (item: Opportunity) => void }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ program: "Todos", area: "Todas", group: "Todos", researcher: "Todos", type: "Todos", state: "Todos", deadline: "Qualquer" });
  const set = (key: keyof typeof filters, value: string) => setFilters({ ...filters, [key]: value });
  const results = coreEngine.searchGlobal(query, { program: filters.program, area: filters.area, group: filters.group, researcher: filters.researcher, type: filters.type, state: filters.state, deadlineDays: filters.deadline === "Qualquer" ? undefined : Number(filters.deadline) });
  return <div className="search-overlay"><section className="global-search">
    <header><div><span className="section-label">PESQUISA GLOBAL Â· BASE DE DADOS</span><h2>Localizar registos objetivamente</h2><p>Pesquisa literal em tÃ­tulos, keywords, Ã¡reas, programas e metadados. NÃ£o usa o Workspace nem calcula adequaÃ§Ã£o.</p></div><button onClick={onClose}>Ã—</button></header>
    <div className="global-query"><span>âŒ•</span><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="TÃ­tulo, keyword, cÃ³digo, programa, Ã¡rea ou metadado..." /><kbd>ESC</kbd></div>
    <div className="global-layout"><aside><strong>Filtros da base</strong><label>Programa<select value={filters.program} onChange={e => set("program", e.target.value)}><option>Todos</option>{coreEngine.facets.programs.map(value => <option key={value}>{value}</option>)}</select></label><label>Ãrea<select value={filters.area} onChange={e => set("area", e.target.value)}><option>Todas</option>{coreEngine.facets.areas.map(value => <option key={value}>{value}</option>)}</select></label><label>Grupo IT<select value={filters.group} onChange={e => set("group", e.target.value)}><option>Todos</option>{coreEngine.facets.groups.map(value => <option key={value}>{value}</option>)}</select></label><label>Investigador<select value={filters.researcher} onChange={e => set("researcher", e.target.value)}><option>Todos</option>{coreEngine.facets.researchers.map(value => <option key={value}>{value}</option>)}</select></label><label>Tipo<select value={filters.type} onChange={e => set("type", e.target.value)}><option>Todos</option>{coreEngine.facets.types.map(value => <option key={value}>{value}</option>)}</select></label><label>Estado<select value={filters.state} onChange={e => set("state", e.target.value)}><option>Todos</option>{coreEngine.facets.states.map(value => <option key={value}>{value}</option>)}</select></label><label>Deadline<select value={filters.deadline} onChange={e => set("deadline", e.target.value)}><option>Qualquer</option><option value="30">â‰¤ 30 dias</option><option value="90">â‰¤ 90 dias</option><option value="180">â‰¤ 180 dias</option></select></label><button className="text-button" onClick={() => setFilters({ program: "Todos", area: "Todas", group: "Todos", researcher: "Todos", type: "Todos", state: "Todos", deadline: "Qualquer" })}>Limpar filtros</button></aside>
      <div className="global-results"><div><strong>{results.length} resultados</strong><span>Resultados objetivos Â· sem ranking contextual</span></div>{results.map(item => <button key={item.id} onClick={() => onOpen(item)}><span className="result-icon">â–¦</span><span><small>OPORTUNIDADE Â· {item.code}</small><strong>{item.name}</strong><em>{item.program} Â· {item.area} Â· {item.group}</em></span><Tag tone={item.state === "Aberta" ? "good" : "warn"}>{item.state}</Tag><span className="result-deadline">{item.deadline}</span></button>)}{results.length === 0 && <div className="no-results">Nenhum registo contÃ©m estes termos e metadados.</div>}</div>
    </div></section></div>;
}

function DetailDrawer({ item, onClose, onDecide }: { item: Opportunity; onClose: () => void; onDecide: () => void }) {
  return <div className="overlay" onMouseDown={onClose}><aside className="detail-drawer" onMouseDown={(e) => e.stopPropagation()}><header><span className="section-label">EVIDÃŠNCIA DA OPORTUNIDADE</span><button onClick={onClose}>Ã—</button></header><Tag tone={item.tone}>{item.fit}</Tag><h2>{item.name}</h2><p className="lead">{item.observations || item.why}</p><dl className="detail-list"><div><dt>Deadline</dt><dd>{item.deadline}</dd></div><div><dt>Programa</dt><dd>{item.program}</dd></div><div><dt>ConsÃ³rcio</dt><dd>{item.condition || "Por confirmar"}</dd></div><div><dt>Investigadores</dt><dd>{item.researcher || "Sem matching"}</dd></div></dl><div className="fit-box"><strong>Alinhamento registado</strong><p>{item.why || "Sem justificaÃ§Ã£o registada."}</p></div><div className="source"><small>FONTE OFICIAL</small><strong>{item.link || "Por confirmar"}</strong><span>Origem: {item.source}</span></div><footer><button className="button secondary" onClick={onClose}>Fechar</button><button className="button" onClick={onDecide}>Adicionar e comparar</button></footer></aside></div>;
}

