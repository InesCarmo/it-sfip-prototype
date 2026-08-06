"use client";

import { useMemo, useState } from "react";

type Mission = "home" | "opportunities" | "discover" | "decide" | "communicate" | "track" | "intelligence";
type WorkspaceKey = "idea" | "company" | "researcher";

const missions: { id: Mission; label: string; glyph: string }[] = [
  { id: "home", label: "Início", glyph: "⌒" },
  { id: "opportunities", label: "Oportunidades", glyph: "▦" },
  { id: "discover", label: "Descobrir", glyph: "◎" },
  { id: "decide", label: "Decidir", glyph: "◇" },
  { id: "communicate", label: "Comunicar", glyph: "▷" },
  { id: "track", label: "Acompanhar", glyph: "☑" },
  { id: "intelligence", label: "Inteligência", glyph: "∴" },
];

const workspaces = {
  idea: { eyebrow: "IDEIA", title: "Redes privadas 6G para indústria", meta: "Em exploração · Responsável: Inês Carmo", tone: "blue" },
  company: { eyebrow: "EMPRESA", title: "ABC Energia", meta: "2 ideias ativas · Último contacto há 4 dias", tone: "amber" },
  researcher: { eyebrow: "INVESTIGADORA", title: "Ana Silva", meta: "Pattern and Image Analysis · 3 ideias", tone: "green" },
};

const opportunities = [
  { id: "horizon", code: "HORIZON-CL4-2026-SNS", name: "HORIZON-CL4 — Smart Networks and Services", program: "Horizon Europe", area: "Redes & Comunicações", group: "Network Architectures and Protocols", researcher: "A validar", type: "Projeto colaborativo", state: "Aberta", fit: "Forte adequação", deadline: "14 out 2026", days: 69, condition: "Consórcio internacional", why: "6G, redes privadas e pilotos industriais", tone: "good" },
  { id: "eurostars", code: "EUROSTARS-12", name: "Eurostars Call 12", program: "Eureka", area: "Transversal", group: "Network Applications and Services", researcher: "A validar", type: "I&D empresarial", state: "Prevista", fit: "Adequação condicionada", deadline: "19 mar 2027", days: 225, condition: "PME líder · 2 países", why: "I&D empresarial e protótipo próximo do mercado", tone: "warn" },
  { id: "compete", code: "MPR-2026-7", name: "COMPETE 2030 — I&D em Copromoção", program: "COMPETE 2030", area: "Transversal", group: "Todos os grupos", researcher: "A validar", type: "I&D empresarial", state: "Aberta", fit: "Possível", deadline: "29 dez 2026", days: 145, condition: "Empresa portuguesa líder", why: "Demonstração industrial e participação do IT", tone: "neutral" },
  { id: "erc", code: "ERC-2027-STG", name: "ERC Starting Grant 2027", program: "Horizon Europe", area: "Bottom-up", group: "Todos os grupos", researcher: "Perfis elegíveis", type: "Financiamento individual", state: "Aberta", fit: "Estratégica", deadline: "14 out 2026", days: 69, condition: "PI individual", why: "Consolidação de independência científica", tone: "good" },
  { id: "cost", code: "OC-2026-1", name: "COST Open Call 2026", program: "COST", area: "Networking", group: "Todos os grupos", researcher: "A validar", type: "Networking", state: "Prevista", fit: "Muito alto", deadline: "28 out 2026", days: 83, condition: "Rede europeia", why: "Criação de redes e preparação de consórcios", tone: "good" },
  { id: "digital", code: "DIGITAL-2026-AI-10", name: "Digital Europe — AI Piloting", program: "Digital Europe", area: "IA & Computer Vision", group: "Pattern and Image Analysis", researcher: "A validar", type: "Projeto colaborativo", state: "Aberta", fit: "Alto", deadline: "03 nov 2026", days: 89, condition: "Consórcio europeu", why: "Pilotos de inteligência artificial aplicada", tone: "good" },
  { id: "esa", code: "ARTES-BA", name: "ESA ARTES Business Applications", program: "ESA", area: "Espaço & GNSS", group: "Network Applications and Services", researcher: "A validar", type: "I&D aplicada", state: "Aberta", fit: "Condicionada", deadline: "Contínua", days: 999, condition: "Parceiro utilizador", why: "Serviços digitais suportados por ativos espaciais", tone: "warn" },
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
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
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
        <button className="utility" onClick={() => setGlobalSearchOpen(true)}><span>⌕</span>Pesquisa global</button>
        <button className="utility"><span>⚙</span>Settings</button>
        <div className="user"><span>IC</span><div><strong>Inês Carmo</strong><small>Pre-award manager</small></div></div>
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
          {mission === "opportunities" && <OpportunitiesScreen setDetail={setDetail} navigate={navigate} setGlobalSearchOpen={setGlobalSearchOpen} />}
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
      {globalSearchOpen && <GlobalSearch onClose={() => setGlobalSearchOpen(false)} onOpen={(item) => { setGlobalSearchOpen(false); setDetail(item); }} />}
    </main>
  );
}

function ScreenTitle({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: string; subtitle: string; actions?: React.ReactNode }) {
  return <div className="screen-title"><div><span>{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{actions && <div className="title-actions">{actions}</div>}</div>;
}

function HomeScreen({ navigate, setWorkspace }: { navigate: (m: Mission) => void; setWorkspace: (w: WorkspaceKey) => void }) {
  return <>
    <ScreenTitle eyebrow="QUINTA-FEIRA, 6 DE AGOSTO" title="Bom dia, Inês." subtitle="A sua área de trabalho de funding intelligence." actions={<button className="button" onClick={() => navigate("discover")}>+ Novo pedido</button>} />
    <div className="command-box"><span>✦</span><input placeholder="Pesquise uma call ou descreva um pedido de investigador..." onKeyDown={(e) => { if (e.key === "Enter") navigate("discover"); }} /><button onClick={() => navigate("discover")}>→</button></div>
    <div className="briefing-grid">
      <button className="brief-card urgent" onClick={() => navigate("track")}><strong>3</strong><span>As minhas ações</span><small>1 deadline em risco</small></button>
      <button className="brief-card" onClick={() => navigate("opportunities")}><strong>92</strong><span>Oportunidades</span><small>31 abertas · 18 previstas</small></button>
      <button className="brief-card" onClick={() => navigate("discover")}><strong>7</strong><span>Os meus Workspaces</span><small>3 precisam de decisão</small></button>
      <button className="brief-card" onClick={() => navigate("communicate")}><strong>4</strong><span>As minhas comunicações</span><small>2 rascunhos · 2 agendadas</small></button>
    </div>
    <div className="home-columns">
      <section className="panel"><div className="panel-heading"><div><span className="section-label">REQUER ATENÇÃO</span><h2>Próximas decisões</h2></div><button onClick={() => navigate("track")}>Ver todas</button></div>
        <div className="attention-list">
          <button onClick={() => { setWorkspace("idea"); navigate("decide"); }}><span className="attention-icon">6G</span><div><strong>Selecionar oportunidade para a ideia 6G</strong><small>Deadline em 69 dias · 2 condições pendentes</small></div><Tag tone="warn">Hoje</Tag></button>
          <button onClick={() => { setWorkspace("company"); navigate("discover"); }}><span className="attention-icon">AB</span><div><strong>Completar enquadramento da ABC Energia</strong><small>Falta confirmar TRL e demonstrador</small></div><Tag>2 dias</Tag></button>
          <button onClick={() => { setWorkspace("researcher"); navigate("communicate"); }}><span className="attention-icon">AS</span><div><strong>Responder a Ana Silva</strong><small>Shortlist validada · resposta por enviar</small></div><Tag>Hoje</Tag></button>
        </div>
      </section>
      <section className="panel"><div className="panel-heading"><div><span className="section-label">A MINHA ATIVIDADE</span><h2>Comunicações e sinais</h2></div><button onClick={() => navigate("communicate")}>Ver comunicações</button></div>
        <div className="signal"><span>✉</span><div><strong>Radar ERC · rascunho</strong><p>Segmento: investigadores elegíveis · 8 destinatários.</p><button onClick={() => navigate("communicate")}>Continuar →</button></div></div>
        <div className="signal"><span>↗</span><div><strong>Nova call DIGITAL para AI aplicada</strong><p>Relacionada com 3 ideias e 7 investigadores.</p><button onClick={() => navigate("discover")}>Ver impacto →</button></div></div>
      </section>
    </div>
  </>;
}

function OpportunitiesScreen({ setDetail, navigate, setGlobalSearchOpen }: { setDetail: (v: typeof opportunities[number]) => void; navigate: (m: Mission) => void; setGlobalSearchOpen: (v: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState("Todos");
  const visible = opportunities.filter(item => (state === "Todos" || item.state === state) && `${item.name} ${item.code} ${item.program} ${item.area} ${item.group}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <ScreenTitle eyebrow="EXPLORAÇÃO LIVRE" title="Oportunidades" subtitle="Navegue em todas as calls, independentemente de um Workspace." actions={<><button className="button secondary" onClick={() => setGlobalSearchOpen(true)}>Filtros avançados</button><button className="button" onClick={() => navigate("discover")}>Analisar um pedido</button></>} />
    <div className="library-toolbar"><div className="search-box"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar por call, código, programa, área ou grupo..." /></div><select value={state} onChange={e => setState(e.target.value)}><option>Todos</option><option>Aberta</option><option>Prevista</option></select></div>
    <div className="saved-views"><span>Vistas rápidas</span><button onClick={() => setState("Aberta")}>Abertas</button><button onClick={() => setState("Prevista")}>Previstas</button><button>≤ 90 dias</button><button>Com empresa</button><button>Financiamento individual</button></div>
    <section className="opportunity-table"><header><span>Oportunidade</span><span>Programa</span><span>Tipo</span><span>Estado</span><span>Deadline</span><span>Grupo IT</span></header>{visible.map(item => <button key={item.id} onClick={() => setDetail(item)}><span><strong>{item.name}</strong><small>{item.code} · {item.area}</small></span><span>{item.program}</span><span>{item.type}</span><span><Tag tone={item.state === "Aberta" ? "good" : "warn"}>{item.state}</Tag></span><span><strong>{item.deadline}</strong><small>{item.days < 900 ? `${item.days} dias` : "Contínua"}</small></span><span>{item.group}</span></button>)}</section>
    <div className="table-footer"><span>A mostrar {visible.length} de 92 oportunidades</span><button>1</button><button>2</button><button>3</button><button>…</button><button>12</button></div>
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
  const [mode, setMode] = useState<"campaign" | "reply">("campaign");
  const [campaign, setCampaign] = useState("Radar de oportunidades");
  return <>
    <ScreenTitle eyebrow="MISSÃO 03" title="Comunicar" subtitle="Transforme inteligência em divulgação segmentada ou numa resposta contextual." actions={<div className="mode-switch"><button className={mode === "campaign" ? "active" : ""} onClick={() => { setMode("campaign"); setDrafted(false); }}>Divulgação</button><button className={mode === "reply" ? "active" : ""} onClick={() => { setMode("reply"); setDrafted(false); }}>Resposta individual</button></div>} />
    {mode === "campaign" && <div className="campaign-summary"><button className="active"><strong>4</strong><span>Os meus rascunhos</span></button><button><strong>2</strong><span>Agendadas</span></button><button><strong>8</strong><span>Enviadas este mês</span></button><button><strong>312</strong><span>Destinatários alcançados</span></button></div>}
    <div className="communication-layout">
      <aside className="config-panel"><span className="section-label">{mode === "campaign" ? "SEGMENTAÇÃO" : "CONFIGURAÇÃO"}</span>{mode === "campaign" ? <><label>Formato<select value={campaign} onChange={e => setCampaign(e.target.value)}><option>Radar de oportunidades</option><option>Alerta urgente</option><option>Convite para webinar</option><option>Brokerage / partner search</option><option>Bolsas e carreira</option></select></label><label>Segmento principal<select><option>Grupo IT</option><option>Programa</option><option>Área científica</option><option>Tipo de oportunidade</option><option>Empresas</option></select></label><div className="segment-builder"><span>Pattern and Image Analysis <button>×</button></span><span>AI & Computer Vision <button>×</button></span><span>Digital Europe <button>×</button></span><button>+ Adicionar critério</button></div><label>Canal<select><option>Email + Teams</option><option>Email</option><option>Teams</option><option>LinkedIn</option></select></label><div className="audience-estimate"><strong>24 destinatários</strong><span>18 investigadores · 6 contactos empresariais</span><button>Pré-visualizar audiência</button></div></> : <><label>Tipo<select><option>Resposta ao investigador</option><option>Pedido de validação</option></select></label><label>Audiência<div className="person-chip">AS <span>Ana Silva</span><button>×</button></div></label><label>Tom<select><option>Institucional e direto</option><option>Exploratório</option></select></label></>}<div className="check-list"><strong>Incluir</strong><label><input type="checkbox" defaultChecked /> Oportunidades selecionadas</label><label><input type="checkbox" defaultChecked /> Prazos e elegibilidade</label><label><input type="checkbox" defaultChecked /> Chamada à ação</label><label><input type="checkbox" defaultChecked /> Contacto pre-award</label></div><button className="button wide" onClick={() => setDrafted(true)}>✦ Gerar rascunho</button></aside>
      <section className="draft-panel"><div className="draft-toolbar"><span>PRÉ-VISUALIZAÇÃO · {mode === "campaign" ? campaign : "RESPOSTA"}</span><div><button>A−</button><button>A+</button></div></div>{!drafted ? <div className="empty-draft"><span>✎</span><h3>{mode === "campaign" ? "Defina o segmento da divulgação" : "Pronto para criar a resposta"}</h3><p>{mode === "campaign" ? "A audiência atual inclui 24 contactos relevantes." : "Confirme a audiência e os elementos a incluir."}</p><button className="button" onClick={() => setDrafted(true)}>Gerar rascunho</button></div> : <div className="draft-content"><label>Assunto<input defaultValue={mode === "campaign" ? "IT Funding Radar · AI, dados e oportunidades digitais" : "Oportunidades para a ideia de redes privadas 6G"} /></label><div className="editable" contentEditable suppressContentEditableWarning><p>{mode === "campaign" ? "Caras/os colegas," : "Olá Ana,"}</p><p>{mode === "campaign" ? "Partilhamos uma seleção de oportunidades com alinhamento nas áreas de inteligência artificial, visão computacional e tecnologias digitais." : "Na sequência da análise da ideia sobre redes privadas 6G, identificámos uma oportunidade com forte alinhamento."}</p><div className="message-call"><strong>{mode === "campaign" ? "Digital Europe — AI Piloting" : "HORIZON-CL4 — Smart Networks and Services"}</strong><span>Deadline: {mode === "campaign" ? "3 de novembro de 2026" : "14 de outubro de 2026"}</span><p>{mode === "campaign" ? "Projetos colaborativos para pilotos de IA aplicada. Requer consórcio europeu." : "O IT poderá participar como parceiro científico. É necessário completar o consórcio."}</p></div><p><strong>Manifestação de interesse:</strong> responder até 4 de setembro para apoio ao enquadramento e identificação de parceiros.</p></div></div>}</section>
    </div>
    {drafted && <div className="communication-footer"><div><Tag tone={sent ? "good" : "warn"}>{sent ? "Registada como enviada" : mode === "campaign" ? "24 destinatários · 3 oportunidades" : "1 informação por confirmar"}</Tag><span>{mode === "campaign" ? "Segmentação guardada por Inês Carmo" : "Financiamento nacional Eurostars"}</span></div><button className="button secondary">Guardar rascunho</button><button className="button secondary">Agendar</button><button className="button" onClick={() => { setSent(true); setTimeout(() => navigate("track"), 600); }}>{sent ? "Enviada ✓" : "Registar envio"}</button></div>}
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

function GlobalSearch({ onClose, onOpen }: { onClose: () => void; onOpen: (item: typeof opportunities[number]) => void }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ program: "Todos", area: "Todas", group: "Todos", researcher: "Todos", type: "Todos", state: "Todos", deadline: "Qualquer" });
  const set = (key: keyof typeof filters, value: string) => setFilters({ ...filters, [key]: value });
  const results = opportunities.filter(item => {
    const text = `${item.name} ${item.code} ${item.program} ${item.area} ${item.group} ${item.researcher} ${item.type}`.toLowerCase();
    return text.includes(query.toLowerCase()) &&
      (filters.program === "Todos" || item.program === filters.program) &&
      (filters.area === "Todas" || item.area === filters.area) &&
      (filters.group === "Todos" || item.group === filters.group) &&
      (filters.researcher === "Todos" || item.researcher === filters.researcher) &&
      (filters.type === "Todos" || item.type === filters.type) &&
      (filters.state === "Todos" || item.state === filters.state) &&
      (filters.deadline === "Qualquer" || item.days <= Number(filters.deadline));
  });
  return <div className="search-overlay"><section className="global-search"><header><div><span className="section-label">PESQUISA GLOBAL</span><h2>Pesquisar em toda a plataforma</h2></div><button onClick={onClose}>×</button></header><div className="global-query"><span>⌕</span><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Call, código, programa, área, grupo ou investigador..." /><kbd>ESC</kbd></div><div className="global-layout"><aside><strong>Filtros</strong><label>Programa<select value={filters.program} onChange={e => set("program", e.target.value)}><option>Todos</option><option>Horizon Europe</option><option>Digital Europe</option><option>Eureka</option><option>COMPETE 2030</option><option>COST</option><option>ESA</option></select></label><label>Área<select value={filters.area} onChange={e => set("area", e.target.value)}><option>Todas</option><option>Redes & Comunicações</option><option>IA & Computer Vision</option><option>Espaço & GNSS</option><option>Transversal</option><option>Bottom-up</option><option>Networking</option></select></label><label>Grupo IT<select value={filters.group} onChange={e => set("group", e.target.value)}><option>Todos</option><option>Todos os grupos</option><option>Network Architectures and Protocols</option><option>Network Applications and Services</option><option>Pattern and Image Analysis</option></select></label><label>Investigador<select value={filters.researcher} onChange={e => set("researcher", e.target.value)}><option>Todos</option><option>A validar</option><option>Perfis elegíveis</option></select></label><label>Tipo<select value={filters.type} onChange={e => set("type", e.target.value)}><option>Todos</option><option>Projeto colaborativo</option><option>I&D empresarial</option><option>Financiamento individual</option><option>Networking</option></select></label><label>Estado<select value={filters.state} onChange={e => set("state", e.target.value)}><option>Todos</option><option>Aberta</option><option>Prevista</option></select></label><label>Deadline<select value={filters.deadline} onChange={e => set("deadline", e.target.value)}><option>Qualquer</option><option value="30">≤ 30 dias</option><option value="90">≤ 90 dias</option><option value="180">≤ 180 dias</option></select></label><button className="text-button" onClick={() => setFilters({ program: "Todos", area: "Todas", group: "Todos", researcher: "Todos", type: "Todos", state: "Todos", deadline: "Qualquer" })}>Limpar filtros</button></aside><div className="global-results"><div><strong>{results.length} resultados</strong><span>Oportunidades · Workspaces · Investigadores · Comunicações</span></div>{results.map(item => <button key={item.id} onClick={() => onOpen(item)}><span className="result-icon">▦</span><span><small>OPORTUNIDADE · {item.code}</small><strong>{item.name}</strong><em>{item.program} · {item.area} · {item.group}</em></span><Tag tone={item.state === "Aberta" ? "good" : "warn"}>{item.state}</Tag><span className="result-deadline">{item.deadline}</span></button>)}{results.length === 0 && <div className="no-results">Nenhum resultado com estes critérios.</div>}</div></div></section></div>;
}

function DetailDrawer({ item, onClose, onDecide }: { item: typeof opportunities[number]; onClose: () => void; onDecide: () => void }) {
  return <div className="overlay" onMouseDown={onClose}><aside className="detail-drawer" onMouseDown={(e) => e.stopPropagation()}><header><span className="section-label">EVIDÊNCIA DA OPORTUNIDADE</span><button onClick={onClose}>×</button></header><Tag tone={item.tone}>{item.fit}</Tag><h2>{item.name}</h2><p className="lead">Programa colaborativo para desenvolvimento e validação de tecnologias de comunicação avançadas.</p><dl className="detail-list"><div><dt>Deadline</dt><dd>{item.deadline}</dd></div><div><dt>Papel do IT</dt><dd>Parceiro científico</dd></div><div><dt>Consórcio</dt><dd>{item.condition}</dd></div><div><dt>Confiança</dt><dd>Alta · fonte oficial</dd></div></dl><div className="fit-box"><strong>Porque foi sugerida</strong><p>{item.why}. A ideia demonstra alinhamento com quatro resultados esperados da call.</p></div><div className="uncertainty"><span>!</span><div><strong>Por validar</strong><p>Composição final do consórcio e disponibilidade do demonstrador.</p></div></div><div className="source"><small>FONTE OFICIAL</small><strong>Funding & Tenders Portal</strong><span>Verificada em 05/08/2026</span></div><footer><button className="button secondary" onClick={onClose}>Fechar</button><button className="button" onClick={onDecide}>Adicionar e comparar</button></footer></aside></div>;
}
