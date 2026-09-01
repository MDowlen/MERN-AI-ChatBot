import React, { useEffect, useState } from 'react';
import './premium-conversations.css';

const icons = {
  overview: '◫', repositories: '▦', 'pr-risk': '⑂', deployments: '⇧', incidents: '◇', conversations: '◌', health: '◉'
};

export default function PremiumShell({ view, setView, labels, health, children, onAsk }) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
      if (event.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const nav = Object.entries(labels);

  return <div className="premium-shell">
    <aside className="premium-rail" aria-label="Nexa workspace navigation">
      <button className="nexa-glyph" onClick={() => setView('overview')} aria-label="Nexa overview">N</button>
      <nav>
        {nav.map(([id, label]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)} aria-label={label} title={label}><span>{icons[id] || '•'}</span><i>{label}</i></button>)}
      </nav>
      <button className="rail-help" title="Ask Nexa" onClick={() => onAsk(view)}>✦<i>Ask Nexa</i></button>
    </aside>

    <section className="premium-stage">
      <header className="premium-topbar">
        <div className="topbar-brand"><strong>NEXA</strong><span>{labels[view]}</span></div>
        <button className="command-trigger" onClick={() => setPaletteOpen(true)}><kbd>⌘ K</kbd><span>Ask Nexa, find a PR, inspect a deployment…</span></button>
        <div className="topbar-state"><span className={health?.status === 'ok' ? 'state-dot live' : 'state-dot'} /><b>{health?.status === 'ok' ? 'Production' : 'Checking'}</b></div>
      </header>
      <main className="premium-canvas">{children}</main>
    </section>

    {paletteOpen && <div className="command-overlay" role="dialog" aria-modal="true" aria-label="Nexa command palette" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaletteOpen(false); }}>
      <div className="command-palette">
        <div className="palette-input"><span>✦</span><input autoFocus placeholder="Ask Nexa, jump to a workspace, or inspect engineering evidence…" onKeyDown={(event) => { if (event.key === 'Enter' && event.currentTarget.value.trim()) { onAsk(view, event.currentTarget.value.trim()); setPaletteOpen(false); } }} /></div>
        <div className="palette-section"><span>Workspace</span>{nav.slice(0, 5).map(([id, label]) => <button key={id} onClick={() => { setView(id); setPaletteOpen(false); }}><b>{icons[id]}</b><div><strong>{label}</strong><small>Open {label.toLowerCase()} workspace</small></div><kbd>↵</kbd></button>)}</div>
      </div>
    </div>}
  </div>;
}
