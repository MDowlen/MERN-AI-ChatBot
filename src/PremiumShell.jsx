import React, { useEffect, useRef, useState } from 'react';
import './premium-conversations.css';
import './premium-utility.css';

const productionHosts = new Set([
  'mern-ai-chat-bot-one.vercel.app',
  'mern-ai-chat-bot-afros-and-weirdos-solutions.vercel.app',
  'mern-ai-chat-bot-git-main-afros-and-weirdos-solutions.vercel.app'
]);

function WorkspaceIcon({ name }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 19,
    height: 19,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true
  };

  if (name === 'overview') return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
  if (name === 'repositories') return <svg {...common}><path d="M4 7.5h16" /><path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><path d="M8 12h8M8 16h5" /></svg>;
  if (name === 'pr-risk') return <svg {...common}><circle cx="6" cy="5" r="2" /><circle cx="18" cy="19" r="2" /><path d="M6 7v8a4 4 0 0 0 4 4h6" /><path d="M14 5h4v8" /><path d="m16 11 2 2 2-2" /></svg>;
  if (name === 'deployments') return <svg {...common}><path d="M12 16V4" /><path d="m7.5 8.5 4.5-4.5 4.5 4.5" /><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg>;
  if (name === 'incidents') return <svg {...common}><path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>;
  if (name === 'conversations') return <svg {...common}><path d="M21 14a4 4 0 0 1-4 4H9l-5 3v-5a7 7 0 0 1-1-3.6V9a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /><path d="M8 10h8M8 14h5" /></svg>;
  if (name === 'health') return <svg {...common}><path d="M3 12h4l2.2-5 4 10 2.1-5H21" /><circle cx="12" cy="12" r="9" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
}

function getEnvironmentLabel() {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'Local';
  return productionHosts.has(host) ? 'Production' : 'Preview';
}

export default function PremiumShell({ view, setView, labels, health, children, onAsk }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pendingHashView = useRef(null);
  const environment = getEnvironmentLabel();

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

  useEffect(() => {
    const syncFromHash = () => {
      const requested = decodeURIComponent(window.location.hash.slice(1));
      if (requested && labels[requested] && requested !== view) {
        pendingHashView.current = requested;
        setView(requested);
      }
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [labels, setView, view]);

  useEffect(() => {
    if (pendingHashView.current) {
      if (view !== pendingHashView.current) return;
      pendingHashView.current = null;
    }
    const nextHash = `#${view}`;
    if (window.location.hash !== nextHash) window.history.replaceState(null, '', nextHash);
  }, [view]);

  const nav = Object.entries(labels);
  const goTo = (id) => {
    pendingHashView.current = null;
    setView(id);
    setPaletteOpen(false);
  };

  return <div className="premium-shell">
    <aside className="premium-rail" aria-label="Nexa workspace navigation">
      <button type="button" className="nexa-glyph" onClick={() => goTo('overview')} aria-label="Nexa overview">N</button>
      <nav aria-label="Command Center workspaces">
        {nav.map(([id, label]) => <button type="button" key={id} className={view === id ? 'active' : ''} onClick={() => goTo(id)} aria-label={label} aria-current={view === id ? 'page' : undefined} title={label}><WorkspaceIcon name={id} /><i>{label}</i></button>)}
      </nav>
      <button type="button" className="rail-help" title="Ask Nexa" aria-label={`Ask Nexa about ${labels[view]}`} onClick={() => onAsk(view)}>✦<i>Ask Nexa</i></button>
    </aside>

    <section className="premium-stage">
      <header className="premium-topbar">
        <div className="topbar-brand"><strong className="nexa-wordmark">NE<span>X</span>A</strong><span>{labels[view]}</span></div>
        <button type="button" className="command-trigger" aria-haspopup="dialog" aria-expanded={paletteOpen} onClick={() => setPaletteOpen(true)}><kbd>⌘ K</kbd><span>Ask Nexa, find a PR, inspect a deployment…</span></button>
        <div className="topbar-state" aria-live="polite"><span className={health?.status === 'ok' ? 'state-dot live' : 'state-dot'} /><b>{environment}</b></div>
      </header>
      <main className="premium-canvas">{children}</main>
    </section>

    {paletteOpen && <div className="command-overlay" role="dialog" aria-modal="true" aria-label="Nexa command palette" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaletteOpen(false); }}>
      <div className="command-palette">
        <div className="palette-input"><span>✦</span><input autoFocus aria-label="Ask Nexa or search workspaces" placeholder="Ask Nexa, jump to a workspace, or inspect engineering evidence…" onKeyDown={(event) => { if (event.key === 'Enter' && event.currentTarget.value.trim()) { onAsk(view, event.currentTarget.value.trim()); setPaletteOpen(false); } }} /></div>
        <div className="palette-section"><span>Workspace</span>{nav.map(([id, label]) => <button type="button" key={id} onClick={() => goTo(id)}><b><WorkspaceIcon name={id} /></b><div><strong>{label}</strong><small>Open {label.toLowerCase()} workspace</small></div><kbd>↵</kbd></button>)}</div>
      </div>
    </div>}
  </div>;
}
