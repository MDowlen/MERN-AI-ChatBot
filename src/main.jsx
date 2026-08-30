import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import DeploymentView from './DeploymentView.jsx';
import IncidentView from './IncidentView.jsx';
import './styles.css';
import './context.css';

const navItems = [
  ['overview', 'Overview', '⌂'],
  ['repositories', 'Repositories', '◫'],
  ['pr-risk', 'PR Risk', '⑂'],
  ['deployments', 'Deployments', '⇧'],
  ['incidents', 'Incidents', '⚠'],
  ['conversations', 'Conversations', '✦'],
  ['health', 'System Health', '●']
];

const starterPrompts = [
  'Explain this repository architecture',
  'What changed in the latest deployment?',
  'What should I verify before merging this PR?'
];

const surfaceLabels = Object.fromEntries(navItems.map(([id, label]) => [id, label]));

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || body.detail || `Request failed with ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function SparkMark() {
  return <div className="spark-mark" aria-hidden="true"><span /><span /><span /></div>;
}

function StatusDot({ active = false }) {
  return <span className={`status-dot ${active ? 'live' : ''}`} aria-hidden="true" />;
}

function MetricCard({ label, value, detail }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function SurfaceBadge({ status }) {
  const live = status === 'live';
  return <span className={`surface-badge ${live ? 'is-live' : ''}`}>{live ? 'Live' : 'Next splinter'}</span>;
}

function RiskBadge({ band }) {
  return <span className={`risk-badge risk-${band || 'unknown'}`}>{band || 'unknown'} risk</span>;
}

function App() {
  const [view, setView] = useState('overview');
  const [contextSurface, setContextSurface] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [prOverview, setPrOverview] = useState(null);
  const [deploymentOverview, setDeploymentOverview] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [health, setHealth] = useState(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [lastWorkspace, setLastWorkspace] = useState(null);
  const endRef = useRef(null);

  const active = conversations.find((item) => item.id === activeId) ?? null;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? conversations.filter((item) => item.title.toLowerCase().includes(q)) : conversations;
  }, [conversations, search]);

  async function load() {
    setError('');
    try {
      const [healthData, engineering, prs, deployments, list] = await Promise.all([
        api('/api/health'),
        api('/api/engineering/overview'),
        api('/api/engineering/prs'),
        api('/api/engineering/deployments'),
        api('/api/conversations')
      ]);
      setHealth(healthData);
      setOverview(engineering);
      setPrOverview(prs);
      setDeploymentOverview(deployments);
      if (list.length) {
        setConversations(list);
        setActiveId((current) => current || list[0].id);
      } else {
        const created = await api('/api/conversations', { method: 'POST', body: JSON.stringify({}) });
        setConversations([created]);
        setActiveId(created.id);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [active?.messages?.length, busy]);

  function normalizedContext(surface) {
    return surface && surface !== 'conversations' ? surface : contextSurface || 'overview';
  }

  async function newConversation(surface = contextSurface) {
    try {
      const nextContext = normalizedContext(surface);
      const created = await api('/api/conversations', { method: 'POST', body: JSON.stringify({}) });
      setConversations((current) => [created, ...current]);
      setActiveId(created.id);
      setContextSurface(nextContext);
      setLastWorkspace(null);
      setView('conversations');
      setInput('');
    } catch (err) { setError(err.message); }
  }

  function askFromSurface(surface = view) {
    const nextContext = normalizedContext(surface);
    setContextSurface(nextContext);
    setLastWorkspace(null);
    setView('conversations');
    requestAnimationFrame(() => document.querySelector('.composer textarea')?.focus());
  }

  async function removeConversation(id) {
    try {
      await api(`/api/conversations/${id}`, { method: 'DELETE' });
      const next = conversations.filter((item) => item.id !== id);
      setConversations(next);
      if (activeId === id) {
        if (next.length) setActiveId(next[0].id);
        else await newConversation(contextSurface);
      }
    } catch (err) { setError(err.message); }
  }

  async function sendMessage(value = input) {
    const content = value.trim();
    if (!content || !activeId || busy) return;
    setBusy(true);
    setError('');
    setInput('');

    const optimistic = {
      id: `optimistic-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString()
    };

    setConversations((current) => current.map((item) =>
      item.id === activeId ? { ...item, messages: [...item.messages, optimistic] } : item
    ));

    try {
      const result = await api(`/api/conversations/${activeId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content,
          workspace: { surface: contextSurface }
        })
      });
      setLastWorkspace(result.workspace || null);
      setConversations((current) => [result.conversation, ...current.filter((item) => item.id !== activeId)]);
    } catch (err) {
      setError(err.message);
      await load();
    } finally {
      setBusy(false);
    }
  }

  function OverviewView() {
    const summary = overview?.summary;
    const latestPreview = deploymentOverview?.latest?.preview;
    return <div className="workspace-content">
      <div className="page-heading"><div><span className="eyebrow">ENGINEERING COMMAND CENTER</span><h2>System overview</h2><p>One workspace for code context, PR risk, deployments, incidents, conversations, and health.</p></div><button className="refresh-button" onClick={load}>↻ Refresh</button></div>
      <div className="metric-grid">
        <MetricCard label="Portfolio systems" value={summary?.repositories ?? '—'} detail="Nexa + Forge ecosystem" />
        <MetricCard label="Open Nexa PRs" value={prOverview?.count ?? '—'} detail="Live GitHub pull requests" />
        <MetricCard label="Latest preview" value={latestPreview?.shortSha || '—'} detail={latestPreview?.state || 'Deployment evidence'} />
        <MetricCard label="Runtime" value={health?.status || '—'} detail={health?.database || 'Checking dependencies'} />
      </div>
      <section className="command-section"><div className="section-title"><div><span>Connected architecture</span><h3>Nexa orchestrates; specialists stay specialized.</h3></div></div>
        <div className="architecture-flow"><div className="arch-node primary">Nexa<span>Product surface + orchestration</span></div><div className="arch-arrow">→</div><div className="arch-column"><div className="arch-node">ForgeContext<span>Grounded repository intelligence</span></div><div className="arch-row"><div className="arch-node">ForgePR<span>Change-risk specialist</span></div><div className="arch-node">ForgeIncident<span>Failure/RCA specialist</span></div></div></div></div>
      </section>
      <section className="command-section"><div className="section-title"><div><span>Build status</span><h3>Command Center surfaces</h3></div></div><div className="surface-grid">{overview?.surfaces?.map((surface) => <button key={surface.id} className="surface-card" onClick={() => setView(surface.id)}><div><strong>{surface.label}</strong><small>{surface.status === 'live' ? 'Available now' : 'Wired in the next implementation splinter'}</small></div><SurfaceBadge status={surface.status} /></button>)}</div></section>
    </div>;
  }

  function RepositoriesView() {
    return <div className="workspace-content"><div className="page-heading"><div><span className="eyebrow">READ-ONLY GITHUB DATA</span><h2>Repositories</h2><p>Nexa reads the portfolio systems without mutating them.</p></div><button className="refresh-button" onClick={() => askFromSurface('repositories')}>✦ Ask Nexa</button></div><div className="repo-grid">{overview?.repositories?.map((repo) => <article className="repo-card" key={repo.id}><div className="repo-card-head"><div><span className="repo-role">{repo.role}</span><h3>{repo.name}</h3></div><span className={`repo-status ${repo.status}`}>{repo.status}</span></div><code>{repo.repo}</code><div className="repo-meta"><span>Branch <b>{repo.defaultBranch || '—'}</b></span><span>Language <b>{repo.language || 'Mixed'}</b></span><span>Issues <b>{repo.openIssues ?? '—'}</b></span></div>{repo.latestCommit && <div className="commit-box"><span>{repo.latestCommit.sha}</span><strong>{repo.latestCommit.message}</strong><small>{repo.latestCommit.committedAt ? new Date(repo.latestCommit.committedAt).toLocaleString() : ''}</small></div>}{repo.error && <p className="inline-error">{repo.error}</p>}</article>)}</div></div>;
  }

  function PRRiskView() {
    return <div className="workspace-content"><div className="page-heading"><div><span className="eyebrow">SPLINTER 2 · PR EVIDENCE</span><h2>PR Risk</h2><p>Nexa owns discovery and deterministic facts. ForgePR remains the specialist for grounded semantic review and generated-test workflows.</p></div><div className="heading-actions"><button className="refresh-button" onClick={load}>↻ Refresh</button><button className="refresh-button" onClick={() => askFromSurface('pr-risk')}>✦ Ask Nexa</button></div></div>
      <div className="boundary-note"><strong>Authority boundary</strong><span>{prOverview?.boundary?.facts}</span><span>{prOverview?.boundary?.specialist}</span></div>
      {!prOverview?.items?.length ? <div className="future-panel"><SparkMark /><h3>No open pull requests found.</h3><p>Create or open a PR in the selected repository and refresh this surface.</p></div> : <div className="pr-list">{prOverview.items.map((pr) => <article className="pr-card" key={pr.number}><div className="pr-head"><div><span className="repo-role">PR #{pr.number} · {pr.draft ? 'draft' : 'open'}</span><h3>{pr.title}</h3><p>{pr.head} → {pr.base}</p></div><RiskBadge band={pr.deterministicRisk?.band} /></div><div className="pr-metrics"><span>Files <b>{pr.changedFiles}</b></span><span>Additions <b>+{pr.additions}</b></span><span>Deletions <b>-{pr.deletions}</b></span><span>Commits <b>{pr.commits}</b></span><span>CI status <b>{pr.combinedStatus}</b></span></div><div className="fact-list"><strong>Deterministic facts</strong>{pr.deterministicRisk?.facts?.length ? pr.deterministicRisk.facts.map((fact) => <div className={`fact-row fact-${fact.severity}`} key={fact.code}><span>{fact.code}</span><p>{fact.detail}</p></div>) : <div className="fact-row fact-info"><span>no-risk-threshold</span><p>No size/churn/CI threshold was triggered.</p></div>}</div><div className="specialist-callout"><span>ForgePR layer</span><p>Semantic quality/safety findings, repository-grounded citations, test generation, and deterministic specialist gating remain separate from these raw facts.</p></div><a className="pr-link" href={pr.url} target="_blank" rel="noreferrer">Open on GitHub ↗</a></article>)}</div>}
    </div>;
  }

  function HealthView() {
    const rows = [
      ['Application', health?.status === 'ok', health?.status],
      ['MongoDB', health?.database === 'mongodb-connected', health?.database],
      ['AI provider configured', health?.assistant === 'openai', health?.assistant],
      ['Engineering overview', Boolean(overview), overview ? overview.mode : 'loading'],
      ['PR facts surface', Boolean(prOverview), prOverview ? `${prOverview.count} open PR(s)` : 'loading'],
      ['Deployment evidence', Boolean(deploymentOverview), deploymentOverview ? `${deploymentOverview.count} recent record(s)` : 'loading']
    ];
    return <div className="workspace-content narrow"><div className="page-heading"><div><span className="eyebrow">DEPENDENCY TRUTH</span><h2>System Health</h2><p>Health means verifying dependencies instead of merely checking that environment variables exist.</p></div><button className="refresh-button" onClick={() => askFromSurface('health')}>✦ Ask Nexa</button></div><div className="health-list">{rows.map(([label, ok, detail]) => <div className="health-row" key={label}><StatusDot active={ok} /><div><strong>{label}</strong><span>{detail || 'unknown'}</span></div></div>)}</div></div>;
  }

  function ConversationsView() {
    return <div className="conversation-layout"><aside className="conversation-rail"><button className="new-chat light" onClick={() => newConversation(contextSurface)}>+ New conversation</button><label className="search-box light"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search history" /></label><nav className="history-list light-list">{filtered.map((conversation) => <div className={`history-item ${conversation.id === activeId ? 'active' : ''}`} key={conversation.id}><button className="history-select" onClick={() => setActiveId(conversation.id)}><span className="history-title">{conversation.title}</span><span className="history-meta">{conversation.messages.length} messages</span></button><button className="history-delete" onClick={() => removeConversation(conversation.id)}>×</button></div>)}</nav></aside><section className="chat-panel"><div className="chat-context-bar"><span>Grounding context</span><strong>{surfaceLabels[contextSurface] || contextSurface}</strong><small>Client sends intent only · server rebuilds evidence</small>{lastWorkspace?.generatedAt && <i>Verified {new Date(lastWorkspace.generatedAt).toLocaleTimeString()}</i>}</div><div className="chat-area">{active?.messages?.length ? <div className="message-column">{active.messages.map((message) => <article className={`message-row ${message.role}`} key={message.id}><div className="avatar">{message.role === 'assistant' ? <SparkMark /> : 'M'}</div><div className="message-body"><div className="message-role">{message.role === 'assistant' ? 'Nexa' : 'You'}</div><p>{message.content}</p></div></article>)}{busy && <article className="message-row assistant"><div className="avatar"><SparkMark /></div><div className="message-body"><div className="message-role">Nexa</div><div className="typing"><span /><span /><span /></div></div></article>}<div ref={endRef} /></div> : <div className="empty-state"><div className="hero-mark"><SparkMark /></div><h2>Ask Nexa about {surfaceLabels[contextSurface] || 'the engineering system'}.</h2><p>Nexa will rebuild the authoritative evidence for this workspace surface on the server before answering.</p><div className="prompt-grid">{starterPrompts.map((prompt) => <button key={prompt} onClick={() => sendMessage(prompt)}>{prompt}<span>↗</span></button>)}</div></div>}</div><div className="composer-wrap">{error && <div className="error-banner">{error}</div>}<form className="composer" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder={`Ask Nexa with ${surfaceLabels[contextSurface] || 'workspace'} context…`} rows="1" maxLength="12000" /><button type="submit" disabled={!input.trim() || busy}>↑</button></form></div></section></div>;
  }

  let content;
  if (view === 'overview') content = <OverviewView />;
  else if (view === 'repositories') content = <RepositoriesView />;
  else if (view === 'pr-risk') content = <PRRiskView />;
  else if (view === 'deployments') content = <div className="context-capable-view"><button className="floating-ask" onClick={() => askFromSurface('deployments')}>✦ Ask Nexa about deployments</button><DeploymentView data={deploymentOverview} onRefresh={load} /></div>;
  else if (view === 'incidents') content = <div className="context-capable-view"><button className="floating-ask" onClick={() => askFromSurface('incidents')}>✦ Ask Nexa about incidents</button><IncidentView /></div>;
  else if (view === 'conversations') content = <ConversationsView />;
  else content = <HealthView />;

  return <div className="app-shell command-shell"><aside className="sidebar command-sidebar"><div className="brand-row"><SparkMark /><div><strong>Nexa</strong><span>Engineering Command Center</span></div></div><button className="new-chat" onClick={() => askFromSurface(view)}>+ Ask Nexa</button><div className="nav-label">Workspace</div><nav className="command-nav">{navItems.map(([id, label, icon]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><span>{icon}</span>{label}{overview?.surfaces?.find((s) => s.id === id)?.status === 'next-splinter' && <i />}</button>)}</nav><div className="stack-card"><div className="stack-title">Current splinter</div><strong>Context-aware Ask Nexa</strong><span>Client supplies workspace intent; server rebuilds authoritative evidence before model reasoning.</span></div></aside><main className="main-panel command-main"><header className="topbar"><div><h1>{surfaceLabels[view]}</h1><p>feature/nexa-command-center · Splinter 5</p></div><div className="health-pill"><StatusDot active={health?.status === 'ok'} /><span>{health?.status === 'ok' ? 'System healthy' : 'Checking system'}</span></div></header>{error && view !== 'conversations' && <div className="global-error">{error}</div>}{content}</main></div>;
}

createRoot(document.getElementById('root')).render(<App />);
