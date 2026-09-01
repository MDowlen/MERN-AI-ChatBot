import React from 'react';

function Stat({ label, value, detail, tone = 'neutral' }) {
  return <article className={`premium-stat ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function Activity({ icon, title, detail, meta, tone = 'neutral' }) {
  return <div className="activity-row"><span className={`activity-icon ${tone}`}>{icon}</span><div><strong>{title}</strong><small>{detail}</small></div><time>{meta}</time></div>;
}

export default function PremiumOverview({ overview, prOverview, deploymentOverview, health, onAsk, setView, onRefresh }) {
  const production = deploymentOverview?.latest?.production;
  const preview = deploymentOverview?.latest?.preview;
  const currentPr = prOverview?.items?.[0];
  const repoCount = overview?.summary?.repositories ?? '—';
  const healthy = health?.status === 'ok';
  const recentRepo = overview?.repositories?.find((repo) => repo.id === 'incident') || overview?.repositories?.[0];

  return <div className="premium-overview">
    <div className="overview-heading">
      <div><h1>Good evening.</h1><p>Here’s what changed across your engineering system.</p></div>
      <div className="overview-actions"><button onClick={onRefresh}>Refresh</button><button className="primary" onClick={() => onAsk('overview')}>✦ Ask Nexa</button></div>
    </div>

    <section className="premium-stats" aria-label="Engineering status summary">
      <Stat label="Repositories" value={repoCount} detail="Nexa + Forge systems" />
      <Stat label="Active PRs" value={prOverview?.count ?? '—'} detail={currentPr ? `#${currentPr.number} · ${currentPr.deterministicRisk?.band || 'unknown'} surface` : 'No open Nexa PR'} tone={currentPr?.deterministicRisk?.band === 'high' ? 'warning' : 'neutral'} />
      <Stat label="Production" value={production?.shortSha || '—'} detail={production?.state || 'Deployment evidence'} tone={production?.state === 'success' ? 'success' : 'neutral'} />
      <Stat label="Incidents" value="0" detail="No active incident signal" tone="success" />
      <Stat label="System" value={healthy ? 'Healthy' : 'Checking'} detail={health?.database || 'Dependency health'} tone={healthy ? 'success' : 'neutral'} />
    </section>

    <div className="overview-grid">
      <section className="premium-panel activity-panel">
        <header><div><span>Recent engineering activity</span><h2>What changed</h2></div><button onClick={() => setView('deployments')}>View deployments</button></header>
        <div className="activity-list">
          <Activity icon="⇧" tone="success" title="Production deployment" detail={production ? `${production.shortSha} · ${production.state}` : 'Waiting for release evidence'} meta={production?.createdAt ? new Date(production.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} />
          <Activity icon="⑂" tone={currentPr?.combinedStatus === 'success' ? 'success' : 'warning'} title={currentPr ? `PR #${currentPr.number} · ${currentPr.title}` : 'Pull request surface'} detail={currentPr ? `${currentPr.changedFiles} files · ${currentPr.additions + currentPr.deletions} lines churn · CI ${currentPr.combinedStatus}` : 'No active PR evidence'} meta={currentPr?.updatedAt ? new Date(currentPr.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} />
          <Activity icon="◇" tone="success" title="ForgeIncident specialist" detail={recentRepo?.status === 'available' ? 'Python RCA specialist available' : 'Checking specialist availability'} meta={recentRepo?.latestCommit?.sha || '—'} />
          <Activity icon="◉" tone={healthy ? 'success' : 'warning'} title="Dependency health" detail={healthy ? `${health.database} · ${health.assistant}` : 'Health check in progress'} meta={healthy ? 'live' : '—'} />
        </div>
      </section>

      <aside className="premium-panel attention-panel">
        <header><div><span>Current attention</span><h2>Suggested next action</h2></div></header>
        {currentPr ? <><div className="attention-risk"><span>PR #{currentPr.number}</span><strong>{currentPr.deterministicRisk?.band || 'unknown'}</strong><small>deterministic surface risk</small></div><p>{currentPr.deterministicRisk?.facts?.[0]?.detail || 'Review the current PR evidence before merge.'}</p><div className="attention-actions"><button onClick={() => setView('pr-risk')}>View PR Risk</button><button className="primary" onClick={() => onAsk('pr-risk', 'What should I investigate first in the current PR?')}>Ask Nexa</button></div></> : <><div className="empty-signal">✓</div><h3>No urgent engineering signal.</h3><p>Production and system dependencies are reporting healthy.</p></>}
      </aside>
    </div>

    <section className="ask-dock">
      <div className="ask-mark">✦</div><div><span>Ask Nexa</span><h2>What should I investigate?</h2><p>The server rebuilds authoritative evidence for the workspace before model reasoning.</p></div><div className="ask-actions"><button onClick={() => onAsk('deployments', 'What changed between preview and production?')}>Compare preview and production</button><button onClick={() => onAsk('pr-risk', 'Summarize current PR risk and tell me what is deterministic versus advisory.')}>Summarize PR risk</button><button className="primary" onClick={() => onAsk('overview')}>Open Ask Nexa</button></div>
    </section>
  </div>;
}
