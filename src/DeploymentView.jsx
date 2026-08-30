import React from 'react';

function ReleaseCard({ label, deployment }) {
  if (!deployment) {
    return (
      <article className="release-card empty-release">
        <span>{label}</span>
        <strong>No visible deployment</strong>
        <small>No release evidence was returned for this environment.</small>
      </article>
    );
  }

  return (
    <article className="release-card">
      <div className="release-card-top">
        <span>{label}</span>
        <i className={`release-state state-${deployment.state}`}>{deployment.state}</i>
      </div>
      <strong>{deployment.shortSha || 'unknown'}</strong>
      <code>{deployment.environment}</code>
      <small>{deployment.createdAt ? new Date(deployment.createdAt).toLocaleString() : 'Unknown time'}</small>
      {deployment.environmentUrl && (
        <a href={deployment.environmentUrl} target="_blank" rel="noreferrer">Open deployment ↗</a>
      )}
    </article>
  );
}

export default function DeploymentView({ data, onRefresh }) {
  const latest = data?.latest || {};
  return (
    <div className="workspace-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SPLINTER 3 · RELEASE EVIDENCE</span>
          <h2>Deployments</h2>
          <p>Connect source commits to release environments before making rollback or incident claims.</p>
        </div>
        <button className="refresh-button" onClick={onRefresh}>↻ Refresh</button>
      </div>

      <div className="boundary-note">
        <strong>Evidence boundary</strong>
        <span>{data?.boundary?.evidence || 'Loading deployment evidence…'}</span>
        <span>{data?.boundary?.provider || ''}</span>
      </div>

      <div className="release-compare">
        <ReleaseCard label="Production" deployment={latest.production} />
        <div className="release-versus">vs</div>
        <ReleaseCard label="Latest preview" deployment={latest.preview} />
      </div>

      <section className="command-section">
        <div className="section-title">
          <div><span>Deterministic release facts</span><h3>What the deployment evidence proves</h3></div>
        </div>
        <div className="release-facts">
          {data?.facts?.length ? data.facts.map((fact) => (
            <div className="release-fact" key={fact.code}>
              <code>{fact.code}</code>
              <p>{fact.detail}</p>
              <span>{fact.state}</span>
            </div>
          )) : <p className="empty-copy">No release facts are available yet.</p>}
        </div>
      </section>

      <section className="command-section">
        <div className="section-title">
          <div><span>Recent release timeline</span><h3>Latest GitHub deployment records</h3></div>
        </div>
        <div className="deployment-table">
          {data?.items?.map((item) => (
            <article className="deployment-row" key={item.id}>
              <div className={`deployment-dot state-${item.state}`} />
              <div>
                <strong>{item.environment}</strong>
                <small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</small>
              </div>
              <code>{item.shortSha || 'unknown'}</code>
              <span>{item.state}</span>
              {item.environmentUrl ? <a href={item.environmentUrl} target="_blank" rel="noreferrer">Open ↗</a> : <em>—</em>}
            </article>
          ))}
        </div>
      </section>

      {data?.sampling && (
        <div className="learning-box deployment-learning">
          <strong>Sampling lesson</strong>
          <p>{data.sampling.reason} Production is queried independently instead of assuming it appears inside the {data.sampling.recentLimit}-item recent window.</p>
        </div>
      )}
    </div>
  );
}
