import React from 'react';
import './premium-deployments.css';

function EnvironmentCard({ label, deployment }) {
  if (!deployment) {
    return (
      <article className="environment-card empty">
        <header><span>{label}</span><i className="environment-state">unknown</i></header>
        <div className="environment-sha">—</div>
        <p>No visible deployment evidence was returned for this environment.</p>
      </article>
    );
  }

  return (
    <article className="environment-card">
      <header>
        <span>{label}</span>
        <i className={`environment-state state-${deployment.state}`}>{deployment.state}</i>
      </header>
      <div className="environment-sha">{deployment.shortSha || 'unknown'}</div>
      <div className="environment-meta">
        <div><span>Environment</span><b>{deployment.environment || label}</b></div>
        <div><span>Released</span><b>{deployment.createdAt ? new Date(deployment.createdAt).toLocaleString() : 'Unknown'}</b></div>
        <div><span>Source ref</span><code>{deployment.ref || deployment.sha || 'unknown'}</code></div>
        <div><span>State</span><b>{deployment.state || 'unknown'}</b></div>
      </div>
      {deployment.environmentUrl && <a href={deployment.environmentUrl} target="_blank" rel="noreferrer">Open deployment ↗</a>}
    </article>
  );
}

export default function DeploymentView({ data, onRefresh }) {
  const latest = data?.latest || {};
  const production = latest.production;
  const preview = latest.preview;
  const differs = Boolean(production?.sha && preview?.sha && production.sha !== preview.sha);

  return (
    <div className="premium-deployments">
      <div className="deploy-head">
        <div>
          <h1>Deployments</h1>
          <p>See exactly what is running in production, what is ahead in preview, and which release evidence supports that conclusion.</p>
        </div>
        <button onClick={onRefresh}>↻ Refresh evidence</button>
      </div>

      <div className="environment-compare">
        <EnvironmentCard label="Production" deployment={production} />
        <div className="deploy-versus">VS</div>
        <EnvironmentCard label="Preview" deployment={preview} />
      </div>

      <div className="release-relation">
        <i />
        <div>
          <strong>{differs ? 'Preview and production point to different commits.' : 'Preview and production currently align.'}</strong>
          <span>{differs ? 'Nexa treats that difference as release evidence—not automatically as a problem.' : 'The visible release evidence points to the same source state.'}</span>
        </div>
      </div>

      <div className="release-layout">
        <section className="release-panel">
          <header><div><span>Release lineage</span><h2>Recent deployment history</h2></div></header>
          <div className="release-timeline">
            {data?.items?.length ? data.items.map((item) => (
              <article className="release-line" key={item.id}>
                <i className={`dot ${item.state}`} />
                <div><strong>{item.environment}</strong><small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Unknown time'}</small></div>
                <code>{item.shortSha || 'unknown'}</code>
                <span>{item.state}</span>
                {item.environmentUrl ? <a href={item.environmentUrl} target="_blank" rel="noreferrer">Open ↗</a> : <em>—</em>}
              </article>
            )) : <p className="empty-copy">No deployment records are available yet.</p>}
          </div>
        </section>

        <aside className="release-panel">
          <header><div><span>Deterministic evidence</span><h2>What Nexa can prove</h2></div></header>
          <div className="release-fact-list">
            {data?.facts?.length ? data.facts.map((fact) => (
              <article className="release-fact-item" key={fact.code}>
                <code>{fact.code}</code>
                <p>{fact.detail}</p>
                <span>{fact.state}</span>
              </article>
            )) : <p className="empty-copy">No deterministic release facts are available.</p>}
          </div>

          {data?.sampling && (
            <div className="sampling-note">
              <strong>Sampling boundary</strong>
              <p>{data.sampling.reason} Production is queried separately from the recent {data.sampling.recentLimit}-item window so preview-heavy history cannot create a false “missing production” conclusion.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
