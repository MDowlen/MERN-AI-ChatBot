import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import DeploymentView from './DeploymentView.jsx';
import IncidentView from './IncidentView.jsx';
import PremiumShell from './PremiumShell.jsx';
import PremiumOverview from './PremiumOverview.jsx';
import './styles.css';
import './context.css';
import './premium.css';

const surfaceLabels = {
  overview: 'Overview', repositories: 'Repositories', 'pr-risk': 'PR Risk', deployments: 'Deployments', incidents: 'Incidents', conversations: 'Conversations', health: 'System Health'
};

const starterPrompts = [
  'Explain this repository architecture',
  'What changed in the latest deployment?',
  'What should I verify before merging this PR?'
];

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
        api('/api/health'), api('/api/engineering/overview'), api('/api/engineering/prs'), api('/api/engineering/deployments'), api('/api/conversations')
      ]);
      setHealth(healthData); setOverview(engineering); setPrOverview(prs); setDeploymentOverview(deployments);
      if (list.length) {
        setConversations(list); setActiveId((current) => current || list[0].id);
      } else {
        const created = await api('/api/conversations', { method: 'POST', body: '{}' });
        setConversations([created]); setActiveId(created.id);
      }
    } catch (err) { setError(err.message); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [active?.messages?.length, busy]);

  function normalizedContext(surface) {
    return surface && surface !== 'conversations' ? surface : contextSurface || 'overview';
  }

  async function newConversation(surface = contextSurface) {
    try {
      const nextContext = normalizedContext(surface);
      const created = await api('/api/conversations', { method: 'POST', body: '{}' });
      setConversations((current) => [created, ...current]); setActiveId(created.id); setContextSurface(nextContext); setLastWorkspace(null); setView('conversations'); setInput('');
    } catch (err) { setError(err.message); }
  }

  function askFromSurface(surface = view, suggested = '') {
    const nextContext = normalizedContext(surface);
    setContextSurface(nextContext); setLastWorkspace(null); setView('conversations');
    if (suggested) setInput(suggested);
    requestAnimationFrame(() => document.querySelector('.composer textarea')?.focus());
  }

  async function removeConversation(id) {
    try {
      await api(`/api/conversations/${id}`, { method: 'DELETE' });
      const next = conversations.filter((item) => item.id !== id); setConversations(next);
      if (activeId === id) { if (next.length) setActiveId(next[0].id); else await newConversation(contextSurface); }
    } catch (err) { setError(err.message); }
  }

  async function sendMessage(value = input) {
    const content = value.trim(); if (!content || !activeId || busy) return;
    setBusy(true); setError(''); setInput('');
    const optimistic = { id: `optimistic-${Date.now()}`, role: 'user', content, createdAt: new Date().toISOString() };
    setConversations((current) => current.map((item) => item.id === activeId ? { ...item, messages: [...item.messages, optimistic] } : item));
    try {
      const result = await api(`/api/conversations/${activeId}/messages`, {
        method: 'POST', body: JSON.stringify({ content, workspace: { surface: contextSurface } })
      });
      setLastWorkspace(result.workspace || null);
      setConversations((current) => [result.conversation, ...current.filter((item) => item.id !== activeId)]);
    } catch (err) { setError(err.message); await load(); } finally { setBusy(false); }
  }

  function RepositoriesView() {
    return <div className="workspace-content"><div className="page-heading"><div><h2>Repositories</h2><p>Read-only engineering context across the Nexa and Forge ecosystem.</p></div><button className="refresh-button" onClick={() => askFromSurface('repositories')}>✦ Ask Nexa</button></div><div className="repo-grid">{overview?.repositories?.map((repo) => <article className="repo-card" key={repo.id}><div className="repo-card-head"><div><span className="repo-role">{repo.role}</span><h3>{repo.name}</h3></div><span className={`repo-status ${repo.status}`}>{repo.status}</span></div><code>{repo.repo}</code><div className="repo-meta"><span>Branch <b>{repo.defaultBranch || '—'}</b></span><span>Language <b>{repo.language || 'Mixed'}</b></span><span>Issues <b>{repo.openIssues ?? '—'}</b></span></div>{repo.latestCommit && <div className="commit-box"><span>{repo.latestCommit.sha}</span><strong>{repo.latestCommit.message}</strong><small>{repo.latestCommit.committedAt ? new Date(repo.latestCommit.committedAt).toLocaleString() : ''}</small></div>}</article>)}</div></div>;
  }

  function PRRiskView() {
    return <div className="workspace-content"><div className="page-heading"><div><h2>PR Risk</h2><p>Deterministic size, churn, and CI evidence. Semantic review remains ForgePR territory.</p></div><div className="heading-actions"><button className="refresh-button" onClick={load}>Refresh</button><button className="refresh-button" onClick={() => askFromSurface('pr-risk')}>✦ Ask Nexa</button></div></div><div className="boundary-note"><strong>Authority boundary</strong><span>{prOverview?.boundary?.facts}</span><span>{prOverview?.boundary?.specialist}</span></div>{!prOverview?.items?.length ? <div className="future-panel"><h3>No open pull requests found.</h3><p>Create or open a PR and refresh this workspace.</p></div> : <div className="pr-list">{prOverview.items.map((pr) => <article className="pr-card" key={pr.number}><div className="pr-head"><div><span className="repo-role">PR #{pr.number} · {pr.draft ? 'draft' : 'open'}</span><h3>{pr.title}</h3><p>{pr.head} → {pr.base}</p></div><RiskBadge band={pr.deterministicRisk?.band} /></div><div className="pr-metrics"><span>Files <b>{pr.changedFiles}</b></span><span>Additions <b>+{pr.additions}</b></span><span>Deletions <b>-{pr.deletions}</b></span><span>Commits <b>{pr.commits}</b></span><span>CI <b>{pr.combinedStatus}</b></span></div><div className="fact-list"><strong>Deterministic facts</strong>{pr.deterministicRisk?.facts?.map((fact) => <div className={`fact-row fact-${fact.severity}`} key={fact.code}><span>{fact.code}</span><p>{fact.detail}</p></div>)}</div><a className="pr-link" href={pr.url} target="_blank" rel="noreferrer">Open on GitHub ↗</a></article>)}</div>}</div>;
  }

  function HealthView() {
    const rows = [
      ['Application', health?.status === 'ok', health?.status], ['MongoDB', health?.database === 'mongodb-connected', health?.database], ['AI provider', health?.assistant === 'openai', health?.assistant], ['Engineering overview', Boolean(overview), overview?.mode], ['PR facts', Boolean(prOverview), prOverview ? `${prOverview.count} open PR(s)` : 'loading'], ['Deployment evidence', Boolean(deploymentOverview), deploymentOverview ? `${deploymentOverview.count} recent records` : 'loading']
    ];
    return <div className="workspace-content narrow"><div className="page-heading"><div><h2>System Health</h2><p>Dependency truth, not environment-variable optimism.</p></div><button className="refresh-button" onClick={() => askFromSurface('health')}>✦ Ask Nexa</button></div><div className="health-list">{rows.map(([label, ok, detail]) => <div className="health-row" key={label}><StatusDot active={ok} /><div><strong>{label}</strong><span>{detail || 'unknown'}</span></div></div>)}</div></div>;
  }

  function ConversationsView() {
    return <div className="conversation-layout"><aside className="conversation-rail"><button className="new-chat light" onClick={() => newConversation(contextSurface)}>+ New conversation</button><label className="search-box light"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search history" /></label><nav className="history-list light-list">{filtered.map((conversation) => <div className={`history-item ${conversation.id === activeId ? 'active' : ''}`} key={conversation.id}><button className="history-select" onClick={() => setActiveId(conversation.id)}><span className="history-title">{conversation.title}</span><span className="history-meta">{conversation.messages.length} messages</span></button><button className="history-delete" onClick={() => removeConversation(conversation.id)}>×</button></div>)}</nav></aside><section className="chat-panel"><div className="chat-context-bar"><span>Context</span><strong>{surfaceLabels[contextSurface]}</strong><small>Client sends intent only · server rebuilds evidence</small>{lastWorkspace?.generatedAt && <i>Verified {new Date(lastWorkspace.generatedAt).toLocaleTimeString()}</i>}</div><div className="chat-area">{active?.messages?.length ? <div className="message-column">{active.messages.map((message) => <article className={`message-row ${message.role}`} key={message.id}><div className="avatar">{message.role === 'assistant' ? <SparkMark /> : 'M'}</div><div className="message-body"><div className="message-role">{message.role === 'assistant' ? 'Nexa' : 'You'}</div><p>{message.content}</p></div></article>)}{busy && <article className="message-row assistant"><div className="avatar"><SparkMark /></div><div className="message-body"><div className="message-role">Nexa</div><div className="typing"><span /><span /><span /></div></div></article>}<div ref={endRef} /></div> : <div className="empty-state"><div className="hero-mark"><SparkMark /></div><h2>Ask Nexa about {surfaceLabels[contextSurface]}.</h2><p>Nexa rebuilds authoritative evidence for this workspace on the server before answering.</p><div className="prompt-grid">{starterPrompts.map((prompt) => <button key={prompt} onClick={() => sendMessage(prompt)}>{prompt}<span>↗</span></button>)}</div></div>}</div><div className="composer-wrap">{error && <div className="error-banner">{error}</div>}<form className="composer" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder={`Ask Nexa with ${surfaceLabels[contextSurface]} context…`} rows="1" maxLength="12000" /><button type="submit" disabled={!input.trim() || busy}>↑</button></form></div></section></div>;
  }

  let content;
  if (view === 'overview') content = <PremiumOverview overview={overview} prOverview={prOverview} deploymentOverview={deploymentOverview} health={health} onAsk={askFromSurface} setView={setView} onRefresh={load} />;
  else if (view === 'repositories') content = <RepositoriesView />;
  else if (view === 'pr-risk') content = <PRRiskView />;
  else if (view === 'deployments') content = <div className="context-capable-view"><button className="floating-ask" onClick={() => askFromSurface('deployments')}>✦ Ask Nexa about deployments</button><DeploymentView data={deploymentOverview} onRefresh={load} /></div>;
  else if (view === 'incidents') content = <div className="context-capable-view"><button className="floating-ask" onClick={() => askFromSurface('incidents')}>✦ Ask Nexa about incidents</button><IncidentView /></div>;
  else if (view === 'conversations') content = <ConversationsView />;
  else content = <HealthView />;

  return <PremiumShell view={view} setView={setView} labels={surfaceLabels} health={health} onAsk={askFromSurface}>
    {error && view !== 'conversations' && <div className="global-error">{error}</div>}{content}
  </PremiumShell>;
}

createRoot(document.getElementById('root')).render(<App />);
