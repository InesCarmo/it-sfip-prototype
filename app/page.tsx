"use client";

import { useMemo, useState } from "react";

type Mission = "home" | "discover" | "decide" | "communicate" | "track" | "intelligence";
type WorkspaceKey = "idea" | "company" | "researcher";

const missions: { id: Mission; label: string; glyph: string }[] = [
  { id: "home", label: "Início", glyph: "⌒" },
  { id: "discover", label: "Descobrir", glyph: "◎" },
  { id: "decide", label: "Decidir", glyph: "◇" },
  { id: "communicate", label: "Comunicar", glyph: "▷" },
  { id: "track", label: "Acompanhar", glyph: "☑" },
  { id: "intelligence", label: "Inteligência", glyph: "∴" },
];

const workspaces = {
  idea: { eyebrow: "IDEIA", title: "Redes privadas 6G para indústria", meta: "Em exploração · Responsável: Inês M.", tone: "blue" },
  company: { eyebrow: "EMPRESA", title: "ABC Energia", meta: "2 ideias ativas · Último contacto há 4 dias", tone: "amber" },
  researcher: { eyebrow: "INVESTIGADORA", title: "Ana Silva", meta: "Pattern and Image Analysis · 3 ideias", tone: "green" },
};

const opportunities = [
  { id: "horizon", name: "HORIZON-CL4 — Smart Networks and Services", fit: "Forte adequação", deadline: "14 out 2026", condition: "Consórcio internacional", why: "6G, redes privadas e pilotos industriais", tone: "good" },
  { id: "eurostars", name: "Eurostars Call 12", fit: "Adequação condicionada", deadline: "19 mar 2027", condition: "PME líder · 2 países", why: "I&D empresarial e protótipo próximo do mercado", tone: "warn" },
  { id: "compete", name: "COMPETE 2030 — I&D em Copromoção", fit: "Possível", deadline: "29 dez 2026", condition: "Empresa portuguesa líder", why: "Demonstração industrial e participação do IT", tone: "neutral" },
];

const initialTasks = [
  { id: 1, label: "Pedir à ABC Energia confirmação do demonstrador", due: "Hoje", group: "Hoje", done: false },
  { id: 2, label: "Validar elegibilidade com coordenador NAP", due: "Hoje", group: "Hoje", done: false },
  { id: 3, label: "Responder à investigadora Ana Silva", due: "Hoje", group: "Hoje", done: false },
  { id: 4, label: "Identificar parceiro europeu de automação industrial", due: "11 ago", group: "Esta semana", done: false },
  { id: 5, label: "Rever nova documentação Horizon", due: "13 ago", group: "Esta semana", done: false },
];

function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}

function OpportunityCard({ item, selected, onSelect, onOpen }: { item: typeof opportunities[number]; selected: boolean; onSelect: () => void; onOpen: () => void }) {
  return (
    <article className={`opportunity-card ${selected ? "selected" : ""}`}>
      <div className="card-kicker"><Tag tone={item.tone}>{item.fit}</Tag><span>{item.deadline}</span></div>
      <h3>{item.name}</h3>
      <p><strong>Porquê:</strong> {item.why}</p>
      <p><strong>Condição:</strong> {item.condition}</p>
      <div className="card-actions">
        <button className="button secondary" onClick={onOpen}>Ver evidência</button>
        <button className="button" onClick={onSelect}>{selected ? "Na shortlist" : "Adicionar"}</button>
      </div>
    </article>
  );
}

export default function Home() {
  const [mission, setMission] = useState<Mission>("home");
  const [workspace, setWorkspace] = useState<WorkspaceKey>("idea");
  const [workspaceMenu, setWorkspaceMenu] = useState(false);
  const [shortlist, setShortlist] = useState<string[]>(["horizon", "eurostars", "compete"]);
  const [detail, setDetail] = useState<typeof opportunities[number] | null>(null);
  const [recommendation, setRecommendation] = useState("horizon");
  const [drafted, setDrafted] = useState(false);
  const [sent, setSent] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantReply, setAssistantReply] = useState("A melhor próxima ação é confirmar o demonstrador industrial antes de fechar a shortlist.");
  const activeWorkspace = workspaces[workspace];
  const shortlistItems = useMemo(() => opportunities.filter((item) => shortlist.includes(item.id)), [shortlist]);

  const navigate = (next: Mission) => { setMission(next); setDetail(null); };
  const askAssistant = () => {
    if (!assistantInput.trim()) return;
    const q = assistantInput.toLowerCase();
    setAssistantReply(q.includes("parceir")
      ? "Falta um parceiro europeu com automação industrial e acesso a ambiente de demonstração. A ABC Energia cobre o papel de utilizador final."
      : q.includes("melhor") || q.includes("oportun")
        ? "A call Horizon é a opção mais forte: cobre 6G e pilotos industriais. O principal risco é completar o consórcio antes de outubro."
        : "Encontrei evidência relevante neste Workspace. Posso convertê-la numa comparação, mensagem ou próxima ação.");
    setAssistantInput("");
  };

  return (
    <main className={`app-shell ${assistantOpen ? "assistant-visible" : ""}`}>
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">IT</span><div><strong>SFIP</strong><small>Funding Intelligence</small></div></div>
        <nav aria-label="Missões">
          <div className="nav-label">MISSÕES</div>
          {missions.map((item) => (
            <button key={item.id} className={mission === item.id ? "active" : ""} onClick={() => navigate(item.id)}>
              <span>{item.glyph}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="nav-label">UTILITÁRIOS</div>
        <button className="utility"><span>⌕</span>Pesquisa global</button>
        <button className="utility"><span>⚙</span>Settings</button>
        <div className="user"><span>IM</span><div><strong>Inês Martins</strong><small>Pre-award manager</small></div></div>
      </aside>

      <section className="main-column">
        <header className="topbar">
          <div className="workspace-switcher">
            <button className="workspace-button" onClick={() => setWorkspaceMenu(!workspaceMenu)}>
              <span className={`workspace-dot ${activeWorkspace.tone}`} />
              <span><small>{activeWorkspace.eyebrow}</small><strong>{activeWorkspace.title}</strong></span>
              <span className="chevron">⌄</span>
            </button>
            {workspaceMenu && (
              <div className="workspace-menu">
                {(Object.keys(workspaces) as WorkspaceKey[]).map((key) => (
                  <button key={key} onClick={() => { setWorkspace(key); setWorkspaceMenu(false); }}>
                    <span className={`workspace-dot ${workspaces[key].tone}`} />
                    <span><small>{workspaces[key].eyebrow}</small>{workspaces[key].title}</span>
                  </button>
                ))}
                <button className="new-workspace">+ Novo Workspace</button>
              </div>
            )}
          </div>
          <div className="workspace-meta">{activeWorkspace.meta}</div>
          <button className="assistant-toggle" onClick={() => setAssistantOpen(!assistantOpen)}>✦ Assistant</button>
        </header>

        <div className="content">
          {mission === "home" && <HomeScreen navigate={navigate} setWorkspace={setWorkspace} />}
          {mission === "discover" && <DiscoverScreen shortlist={shortlist} setShortlist={setShortlist} setDetail={setDetail} navigate={navigate} />}
          {mission === "decide" && <DecideScreen items={shortlistItems} recommendation={recommendation} setRecommendation={setRecommendation} navigate={navigate} />}
          {mission === "communicate" && <CommunicateScreen drafted={drafted} setDrafted={setDrafted} sent={sent} setSent={setSent} navigate={navigate} />}
          {mission === "track" && <TrackScreen tasks={tasks} setTasks={setTasks} />}
          {mission === "intelligence" && <IntelligenceScreen navigate={navigate} />}
        </div>
      </section>

      {assistantOpen && (
        <aside className="assistant-panel">
          <div className="assistant-header"><div><span className="spark">✦</span><strong>Funding Intelligence</strong><small>Contexto: {activeWorkspace.eyebrow.toLowerCase()}</small></div><button onClick={() => setAssistantOpen(false)}>×</button></div>
          <div className="assistant-body">
            <div className="assistant-status"><span className="pulse" />Contexto atualizado</div>
            <div className="assistant-message">{assistantReply}</div>
            <div className="evidence-box"><strong>Evidência utilizada</strong><span>3 oportunidades</span><span>6 perfis internos</span><span>2 condições por validar</span></div>
            <div className="assistant-prompts">
              <button onClick={() => { setAssistantInput("Qual é a melhor oportunidade?"); }}>Qual é a melhor opção?</button>
              <button onClick={() => { setAssistantInput("Que parceiros faltam?"); }}>Que parceiros faltam?</button>
              <button onClick={() => navigate("communicate")}>Preparar uma resposta</button>
            </div>
          </div>
          <div className="assistant-input"><textarea value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); askAssistant(); } }} placeholder="Pergunte sobre este Workspace..." /><button onClick={askAssistant}>↑</button></div>
        </aside>
      )}

      {detail && <DetailDrawer item={detail} onClose={() => setDetail(null)} onDecide={() => { if (!shortlist.includes(detail.id)) setShortlist([...shortlist, detail.id]); setDetail(null); navigate("decide"); }} />}
    </main>
  );
}

function ScreenTitle({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: string; subtitle: string; actions?: React.ReactNode }) {
  return <div className="screen-title"><div><span>{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{actions && <div className="title-actions">{actions}</div>}</div>;
}

function HomeScreen({ navigate, setWorkspace }: { navigate: (m: Mission) => void; setWorkspace: (w: WorkspaceKey) => void }) {
  return <>
    <ScreenTitle eyebrow="QUINTA-FEIRA, 6 DE AGOSTO" title="Bom dia, Inês." subtitle="Três decisões precisam da sua atenção hoje." actions={<button className="button" onClick={() => navigate("discover")}>+ Nova análise</button>} />
    <div className="command-box"><span>✦</span><input placeholder="O que pretende descobrir, decidir ou comunicar?" onKeyDown={(e) => { if (e.key === "Enter") navigate("discover"); }} /><button onClick={() => navigate("discover")}>→</button></div>
    <div className="briefing-grid">
      <button className="brief-card urgent" onClick={() => navigate("track")}><strong>3</strong><span>Ações para hoje</span><small>1 deadline em risco</small></button>
      <button className="brief-card" onClick={() => navigate("discover")}><strong>6</strong><span>Novas oportunidades</span><small>2 com forte adequação</small></button>
      <button className="brief-card" onClick={() => navigate("decide")}><strong>4</strong><span>Decisões pendentes</span><small>Requerem validação</small></button>
      <button className="brief-card" onClick={() => navigate("intelligence")}><strong>2</strong><span>Sinais estratégicos</span><small>AI e energia em crescimento</small></button>
    </div>
    <div className="home-columns">
      <section className="panel"><div className="panel-heading"><div><span className="section-label">REQUER ATENÇÃO</span><h2>Próximas decisões</h2></div><button onClick={() => navigate("track")}>Ver todas</button></div>
        <div className="attention-list">
          <button onClick={() => { setWorkspace("idea"); navigate("decide"); }}><span className="attention-icon">6G</span><div><strong>Selecionar oportunidade para a ideia 6G</strong><small>Deadline em 69 dias · 2 condições pendentes</small></div><Tag tone="warn">Hoje</Tag></button>
          <button onClick={() => { setWorkspace("company"); navigate("discover"); }}><span className="attention-icon">AB</span><div><strong>Completar enquadramento da ABC Energia</strong><small>Falta confirmar TRL e demonstrador</small></div><Tag>2 dias</Tag></button>
          <button onClick={() => { setWorkspace("researcher"); navigate("communicate"); }}><span className="attention-icon">AS</span><div><strong>Responder a Ana Silva</strong><small>Shortlist validada · resposta por enviar</small></div><Tag>Hoje</Tag></button>
        </div>
      </section>
      <section className="panel"><div className="panel-heading"><div><span className="section-label">INTELLIGENCE BRIEFING</span><h2>O que mudou</h2></div><button onClick={() => navigate("intelligence")}>Explorar</button></div>
        <div className="signal"><span>↗</span><div><strong>Nova call DIGITAL para AI aplicada</strong><p>Relacionada com 3 ideias e 7 investigadores.</p><button onClick={() => navigate("discover")}>Ver impacto →</button></div></div>
        <div className="signal"><span>◴</span><div><strong>Deadline Horizon prorrogada</strong><p>Mais 21 dias para completar o consórcio da ideia 6G.</p><button onClick={() => navigate("decide")}>Rever decisão →</button></div></div>
      </section>
    </div>
  </>;
}

function DiscoverScreen({ shortlist, setShortlist, setDetail, navigate }: { shortlist: string[]; setShortlist: (v: string[]) => void; setDetail: (v: typeof opportunities[number]) => void; navigate: (m: Mission) => void }) {
  const [query, setQuery] = useState("Redes privadas 6G para pilotos industriais");
  const [searched, setSearched] = useState(true);
  return <>
    <ScreenTitle eyebrow="MISSÃO 01" title="Descobrir" subtitle="Encontre oportunidades e relações relevantes para o Workspace ativo." actions={<button className="button secondary" onClick={() => navigate("decide")}>Shortlist <span className="count">{shortlist.length}</span></button>} />
    <div className="search-box"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} /><button className="button" onClick={() => setSearched(true)}>Procurar</button></div>
    <div className="filter-row"><button className="chip active">Abertas e futuras</button><button className="chip">≤180 dias</button><button className="chip">Projetos colaborativos</button><button className="chip">Com empresa</button><button className="chip">+ Filtros</button></div>
    <div className="results-heading"><div><span className="section-label">RECOMENDAÇÕES CONTEXTUAIS</span><h2>{searched ? "3 oportunidades prioritárias" : "Pronto para pesquisar"}</h2></div><div className="confidence"><span />Baseado em 12 sinais do Workspace</div></div>
    <div className="opportunity-list">{opportunities.map(item => <OpportunityCard key={item.id} item={item} selected={shortlist.includes(item.id)} onOpen={() => setDetail(item)} onSelect={() => setShortlist(shortlist.includes(item.id) ? shortlist.filter(id => id !== item.id) : [...shortlist, item.id])} />)}</div>
    <div className="perspectives"><span>Explorar também</span><button>Investigadores <b>6</b></button><button>Grupos IT <b>3</b></button><button>Empresas <b>4</b></button><button>Oportunidades futuras <b>8</b></button></div>
  </>;
}

function DecideScreen({ items, recommendation, setRecommendation, navigate }: { items: typeof opportunities; recommendation: string; setRecommendation: (v: string) => void; navigate: (m: Mission) => void }) {
  const [validated, setValidated] = useState(false);
  return <>
    <ScreenTitle eyebrow="MISSÃO 02" title="Decidir" subtitle="Compare alternativas e registe uma recomendação fundamentada." actions={<button className="button secondary">+ Adicionar opção</button>} />
    <div className="decision-summary"><div className="assistant-badge">✦</div><div><span className="section-label">RECOMENDAÇÃO IT-SFIP</span><h2>Priorizar Horizon, mantendo Eurostars como alternativa.</h2><p>Melhor alinhamento científico e papel claro para o IT. O risco principal é completar o consórcio internacional.</p></div><button className="text-button">Porque esta recomendação?</button></div>
    <div className="comparison-grid">
      {items.map((item) => <article key={item.id} className={`compare-card ${recommendation === item.id ? "recommended" : ""}`}>
        <label><input type="radio" checked={recommendation === item.id} onChange={() => setRecommendation(item.id)} /> Selecionar</label>
        <Tag tone={item.tone}>{item.fit}</Tag><h3>{item.name}</h3><div className="deadline"><small>DEADLINE</small><strong>{item.deadline}</strong></div>
        <dl><div><dt>Elegibilidade IT</dt><dd>✓ Confirmada</dd></div><div><dt>Modelo</dt><dd>{item.condition}</dd></div><div><dt>Papel IT</dt><dd>Parceiro científico</dd></div><div><dt>Prazo</dt><dd>{item.id === "horizon" ? "Exigente" : "Adequado"}</dd></div></dl>
        <button className="text-button">Ver análise completa →</button>
      </article>)}
    </div>
    <div className="decision-footer"><div><strong>{validated ? "Decisão validada" : "2 validações pendentes"}</strong><span>{validated ? "Registada por Inês Martins" : "Elegibilidade nacional · disponibilidade do coordenador"}</span></div><button className="button secondary" onClick={() => setValidated(true)}>{validated ? "Validado ✓" : "Pedir validação"}</button><button className="button" onClick={() => navigate("communicate")}>Guardar e comunicar</button></div>
  </>;
}

function CommunicateScreen({ drafted, setDrafted, sent, setSent, navigate }: { drafted: boolean; setDrafted: (v: boolean) => void; sent: boolean; setSent: (v: boolean) => void; navigate: (m: Mission) => void }) {
  return <>
    <ScreenTitle eyebrow="MISSÃO 03" title="Comunicar" subtitle="Converta a decisão numa mensagem clara, segmentada e auditável." />
    <div className="communication-layout">
      <aside className="config-panel"><span className="section-label">CONFIGURAÇÃO</span><label>Tipo<select><option>Resposta ao investigador</option><option>Divulgação segmentada</option><option>Pedido de validação</option></select></label><label>Audiência<div className="person-chip">AS <span>Ana Silva</span><button>×</button></div></label><label>Tom<select><option>Institucional e direto</option><option>Exploratório</option></select></label><div className="check-list"><strong>Incluir</strong><label><input type="checkbox" defaultChecked /> Oportunidade recomendada</label><label><input type="checkbox" defaultChecked /> Alternativa</label><label><input type="checkbox" defaultChecked /> Parceiros necessários</label><label><input type="checkbox" defaultChecked /> Próximos passos</label></div><button className="button wide" onClick={() => setDrafted(true)}>✦ Gerar rascunho</button></aside>
      <section className="draft-panel"><div className="draft-toolbar"><span>PRÉ-VISUALIZAÇÃO</span><div><button>A−</button><button>A+</button></div></div>{!drafted ? <div className="empty-draft"><span>✎</span><h3>Pronto para criar a resposta</h3><p>Confirme a audiência e os elementos a incluir.</p><button className="button" onClick={() => setDrafted(true)}>Gerar rascunho</button></div> : <div className="draft-content"><label>Assunto<input defaultValue="Oportunidades de financiamento para a ideia de redes privadas 6G" /></label><div className="editable" contentEditable suppressContentEditableWarning><p>Olá Ana,</p><p>Na sequência da análise da ideia sobre <strong>redes privadas 6G para aplicações industriais</strong>, identificámos uma oportunidade com forte alinhamento.</p><div className="message-call"><strong>HORIZON-CL4 — Smart Networks and Services</strong><span>Deadline: 14 de outubro de 2026</span><p>O IT poderá participar como parceiro científico. Será necessário completar um consórcio internacional e confirmar um demonstrador industrial.</p></div><p>Como alternativa, recomendamos acompanhar a próxima call Eurostars.</p><p><strong>Próximo passo:</strong> reunião breve para confirmar maturidade, demonstrador e parceiros existentes.</p></div></div>}</section>
    </div>
    {drafted && <div className="communication-footer"><div><Tag tone={sent ? "good" : "warn"}>{sent ? "Registada como enviada" : "1 informação por confirmar"}</Tag><span>Financiamento nacional Eurostars</span></div><button className="button secondary">Exportar</button><button className="button" onClick={() => { setSent(true); setTimeout(() => navigate("track"), 600); }}>{sent ? "Enviada ✓" : "Registar como enviada"}</button></div>}
  </>;
}

function TrackScreen({ tasks, setTasks }: { tasks: typeof initialTasks; setTasks: (v: typeof initialTasks) => void }) {
  const [filter, setFilter] = useState("Todas");
  const visible = filter === "Concluídas" ? tasks.filter(t => t.done) : filter === "Em atraso" ? tasks.slice(0, 2) : tasks;
  return <>
    <ScreenTitle eyebrow="MISSÃO 04" title="Acompanhar" subtitle="Mantenha decisões, validações e deadlines em movimento." actions={<button className="button">+ Nova ação</button>} />
    <div className="filter-row"><button className={`chip ${filter === "Todas" ? "active" : ""}`} onClick={() => setFilter("Todas")}>Todas</button><button className={`chip ${filter === "Em atraso" ? "active" : ""}`} onClick={() => setFilter("Em atraso")}>Em atraso <b>2</b></button><button className="chip">A aguardar terceiros <b>3</b></button><button className={`chip ${filter === "Concluídas" ? "active" : ""}`} onClick={() => setFilter("Concluídas")}>Concluídas</button></div>
    <div className="tracking-layout"><section className="task-board"><div className="panel-heading"><div><span className="section-label">AS MINHAS AÇÕES</span><h2>Prioridades</h2></div><span>{visible.filter(t => !t.done).length} abertas</span></div>{visible.map(task => <label key={task.id} className={`task ${task.done ? "done" : ""}`}><input type="checkbox" checked={task.done} onChange={() => setTasks(tasks.map(t => t.id === task.id ? {...t, done: !t.done} : t))} /><span className="task-check">✓</span><div><strong>{task.label}</strong><small>Ideia: Redes privadas 6G</small></div><Tag tone={task.due === "Hoje" ? "warn" : "neutral"}>{task.due}</Tag><button>···</button></label>)}</section><aside className="risk-panel"><span className="section-label">RISCOS DO WORKSPACE</span><div className="risk high"><span>!</span><div><strong>Consórcio incompleto</strong><p>Falta parceiro europeu industrial.</p></div></div><div className="risk"><span>?</span><div><strong>TRL por confirmar</strong><p>Necessário antes da decisão final.</p></div></div><div className="next-action"><small>PRÓXIMA MELHOR AÇÃO</small><strong>Contactar ABC Energia</strong><button>Iniciar →</button></div></aside></div>
  </>;
}

function IntelligenceScreen({ navigate }: { navigate: (m: Mission) => void }) {
  return <>
    <ScreenTitle eyebrow="MISSÃO 05" title="Inteligência" subtitle="Transforme sinais dispersos em oportunidades e ações institucionais." actions={<button className="button secondary">Briefing semanal ↓</button>} />
    <div className="intelligence-hero"><div><span className="section-label">FUNDING BRIEFING · 6 AGO 2026</span><h2>AI aplicada e conectividade avançada concentram os principais sinais desta semana.</h2><p>Foram identificadas 6 oportunidades, 3 alterações oficiais e uma lacuna persistente em parceiros industriais.</p></div><div className="briefing-score"><strong>12</strong><span>sinais analisados</span></div></div>
    <div className="insight-grid"><article className="insight-card"><div className="insight-icon">↗</div><Tag tone="good">Oportunidade</Tag><h3>DIGITAL reforça AI aplicada</h3><p>Três novas oportunidades cruzam saúde, energia e dados.</p><div className="impact"><span>7 investigadores</span><span>3 ideias</span></div><button onClick={() => navigate("discover")}>Explorar impacto →</button></article><article className="insight-card"><div className="insight-icon">!</div><Tag tone="warn">Lacuna</Tag><h3>Parceiros industriais insuficientes</h3><p>Quatro ideias dependem de empresas com capacidade de demonstração.</p><div className="impact"><span>4 ideias</span><span>2 deadlines</span></div><button onClick={() => navigate("track")}>Ver ações →</button></article><article className="insight-card"><div className="insight-icon">◎</div><Tag>Tendência</Tag><h3>Próximas aberturas ERC</h3><p>Cinco perfis internos poderão beneficiar de preparação antecipada.</p><div className="impact"><span>5 investigadores</span><span>2027</span></div><button>Ver perfis →</button></article></div>
    <section className="coverage-panel"><div className="panel-heading"><div><span className="section-label">COBERTURA ESTRATÉGICA</span><h2>Onde temos oportunidades e capacidade</h2></div><div className="view-switch"><button className="active">Temas</button><button>Grupos</button><button>Programas</button></div></div><div className="coverage-row"><span>AI & Computer Vision</span><div className="bar"><i style={{width:"84%"}} /></div><strong>Alta</strong><small>18 oportunidades</small></div><div className="coverage-row"><span>Redes & Comunicações</span><div className="bar"><i style={{width:"70%"}} /></div><strong>Alta</strong><small>14 oportunidades</small></div><div className="coverage-row"><span>Energia & Power Electronics</span><div className="bar"><i style={{width:"48%"}} /></div><strong>Média</strong><small>9 oportunidades</small></div><div className="coverage-row"><span>Quantum</span><div className="bar low"><i style={{width:"22%"}} /></div><strong>Baixa</strong><small>Competência externa</small></div></section>
  </>;
}

function DetailDrawer({ item, onClose, onDecide }: { item: typeof opportunities[number]; onClose: () => void; onDecide: () => void }) {
  return <div className="overlay" onMouseDown={onClose}><aside className="detail-drawer" onMouseDown={(e) => e.stopPropagation()}><header><span className="section-label">EVIDÊNCIA DA OPORTUNIDADE</span><button onClick={onClose}>×</button></header><Tag tone={item.tone}>{item.fit}</Tag><h2>{item.name}</h2><p className="lead">Programa colaborativo para desenvolvimento e validação de tecnologias de comunicação avançadas.</p><dl className="detail-list"><div><dt>Deadline</dt><dd>{item.deadline}</dd></div><div><dt>Papel do IT</dt><dd>Parceiro científico</dd></div><div><dt>Consórcio</dt><dd>{item.condition}</dd></div><div><dt>Confiança</dt><dd>Alta · fonte oficial</dd></div></dl><div className="fit-box"><strong>Porque foi sugerida</strong><p>{item.why}. A ideia demonstra alinhamento com quatro resultados esperados da call.</p></div><div className="uncertainty"><span>!</span><div><strong>Por validar</strong><p>Composição final do consórcio e disponibilidade do demonstrador.</p></div></div><div className="source"><small>FONTE OFICIAL</small><strong>Funding & Tenders Portal</strong><span>Verificada em 05/08/2026</span></div><footer><button className="button secondary" onClick={onClose}>Fechar</button><button className="button" onClick={onDecide}>Adicionar e comparar</button></footer></aside></div>;
}
