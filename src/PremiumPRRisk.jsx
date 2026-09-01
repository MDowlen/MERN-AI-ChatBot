import React, { useMemo, useState } from 'react';

function RiskRing({ score = 0, band = 'low' }) {
  const normalized = Math.max(0, Math.min(100, score * 13));
  return <div className={`risk-ring ${band}`} style={{'--risk': `${normalized * 3.6}deg`}}><div><strong>{normalized}</strong><span>{band} risk</span></div></div>;
}

export default function PremiumPRRisk({ data, onRefresh, onAsk }) {
  const [selected, setSelected] = useState(0);
  const items = data?.items || [];
  const pr = items[selected] || items[0];
  const churn = pr ? Number(pr.additions || 0) + Number(pr.deletions || 0) : 0;
  const facts = pr?.deterministicRisk?.facts || [];
  const ciTone = pr?.combinedStatus === 'success' ? 'success' : pr?.combinedStatus === 'pending' ? 'warning' : 'danger';

  const bars = useMemo(() => {
    if (!pr) return [];
    return [
      ['Churn', churn, Math.min(100, Math.round(churn / 12))],
      ['Files', pr.changedFiles || 0, Math.min(100, (pr.changedFiles || 0) * 4)],
      ['Commits', pr.commits || 0, Math.min(100, (pr.commits || 0) * 6)]
    ];
  }, [pr, churn]);

  return <div className="premium-pr-workspace">
    <div className="workspace-head"><div><h1>PR Risk</h1><p>Deterministic change-surface evidence with a strict ForgePR authority boundary.</p></div><div><button onClick={onRefresh}>Refresh</button><button className="primary" onClick={() => onAsk('pr-risk')}>✦ Ask Nexa</button></div></div>

    {!items.length ? <section className="premium-panel premium-empty"><div>⑂</div><h2>No open pull requests</h2><p>Nexa will populate this workspace when GitHub reports an open PR.</p></section> : <div className="pr-workspace-grid">
      <aside className="pr-selector premium-panel">
        <header><span>Open pull requests</span><strong>{items.length}</strong></header>
        {items.map((item, index) => <button key={item.number} className={selected === index ? 'active' : ''} onClick={() => setSelected(index)}><div><span>#{item.number}</span><strong>{item.title}</strong><small>{item.head} → {item.base}</small></div><b className={`mini-risk ${item.deterministicRisk?.band}`}>{item.deterministicRisk?.band || '—'}</b></button>)}
        <div className="authority-mini"><span>Authority</span><p>Nexa measures observable size/churn/CI facts. ForgePR owns semantic findings.</p></div>
      </aside>

      <section className="pr-analysis premium-panel">
        <header className="pr-analysis-head"><div><span>PR #{pr.number} · {pr.draft ? 'draft' : 'open'}</span><h2>{pr.title}</h2><p>{pr.head} → {pr.base}</p></div><span className={`ci-pill ${ciTone}`}>CI {pr.combinedStatus}</span></header>
        <div className="risk-summary-row"><RiskRing score={pr.deterministicRisk?.score || 0} band={pr.deterministicRisk?.band || 'low'} /><div className="risk-bars">{bars.map(([label, value, pct]) => <div key={label}><div><span>{label}</span><b>{value}</b></div><i><em style={{width:`${pct}%`}} /></i></div>)}</div></div>

        <section className="fact-surface"><div className="fact-surface-head"><div><span>Deterministic evidence</span><h3>Why this surface is classified {pr.deterministicRisk?.band || 'low'}</h3></div><small>No semantic defect is implied.</small></div>{facts.length ? <div className="premium-facts">{facts.map((fact) => <article key={fact.code}><span className={`fact-severity ${fact.severity}`}>{fact.severity}</span><div><strong>{fact.code}</strong><p>{fact.detail}</p></div></article>)}</div> : <div className="quiet-fact">No deterministic size, churn, or CI threshold is currently triggered.</div>}</section>

        <div className="pr-bottom-grid"><article><span>Changed files</span><strong>{pr.changedFiles}</strong><small>review surface</small></article><article><span>Additions</span><strong>+{pr.additions}</strong><small>new lines</small></article><article><span>Deletions</span><strong>-{pr.deletions}</strong><small>removed lines</small></article><article><span>Commits</span><strong>{pr.commits}</strong><small>change units</small></article></div>
      </section>

      <aside className="pr-inspector premium-panel">
        <header><span>Evidence inspector</span><h2>Ask against this PR</h2></header>
        <div className="inspector-note"><strong>Nexa facts</strong><p>{data?.boundary?.facts}</p></div>
        <div className="inspector-note specialist"><strong>ForgePR specialist</strong><p>{data?.boundary?.specialist}</p></div>
        <div className="inspector-actions"><button onClick={() => onAsk('pr-risk', `Summarize PR #${pr.number} using only deterministic evidence first, then clearly separate advisory interpretation.`)}>Summarize evidence</button><button onClick={() => onAsk('pr-risk', `What should I verify before merging PR #${pr.number}? Distinguish CI facts from semantic review needs.`)}>What should I verify?</button><a href={pr.url} target="_blank" rel="noreferrer">Open on GitHub ↗</a></div>
      </aside>
    </div>}
  </div>;
}
