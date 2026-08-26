import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const starterPrompts = [
  'Explain how this MERN app works end to end',
  'What makes this project portfolio-ready?',
  'How is this deployed on Vercel?'
];

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function SparkMark() {
  return (
    <div className="spark-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

function StatusDot({ health }) {
  const active = health?.status === 'ok';
  return <span className={`status-dot ${active ? 'live' : ''}`} aria-hidden="true" />;
}

function App() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [health, setHealth] = useState(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const endRef = useRef(null);

  const active = conversations.find((item) => item.id === activeId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? conversations.filter((item) => item.title.toLowerCase().includes(q)) : conversations;
  }, [conversations, search]);

  async function load() {
    try {
      const [healthData, list] = await Promise.all([api('/api/health'), api('/api/conversations')]);
      setHealth(healthData);
      if (list.length) {
        setConversations(list);
        setActiveId(list[0].id);
      } else {
        const created = await api('/api/conversations', { method: 'POST', body: JSON.stringify({}) });
        setConversations([created]);
        setActiveId(created.id);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.messages?.length, busy]);

  async function newConversation() {
    try {
      const created = await api('/api/conversations', { method: 'POST', body: JSON.stringify({}) });
      setConversations((current) => [created, ...current]);
      setActiveId(created.id);
      setInput('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeConversation(id) {
    try {
      await api(`/api/conversations/${id}`, { method: 'DELETE' });
      const next = conversations.filter((item) => item.id !== id);
      setConversations(next);
      if (activeId === id) {
        if (next.length) setActiveId(next[0].id);
        else await newConversation();
      }
    } catch (err) {
      setError(err.message);
    }
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

    setConversations((current) =>
      current.map((item) =>
        item.id === activeId ? { ...item, messages: [...item.messages, optimistic] } : item
      )
    );

    try {
      const result = await api(`/api/conversations/${activeId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      setConversations((current) => {
        const withoutActive = current.filter((item) => item.id !== activeId);
        return [result.conversation, ...withoutActive];
      });
    } catch (err) {
      setError(err.message);
      await load();
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event) {
    event.preventDefault();
    sendMessage();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <SparkMark />
          <div>
            <strong>Nexa</strong>
            <span>MERN workspace</span>
          </div>
        </div>

        <button className="new-chat" onClick={newConversation}>+ New conversation</button>

        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search history" />
        </label>

        <div className="history-label">Recent</div>
        <nav className="history-list" aria-label="Conversation history">
          {filtered.map((conversation) => (
            <div className={`history-item ${conversation.id === activeId ? 'active' : ''}`} key={conversation.id}>
              <button className="history-select" onClick={() => setActiveId(conversation.id)}>
                <span className="history-title">{conversation.title}</span>
                <span className="history-meta">{conversation.messages.length} messages</span>
              </button>
              <button className="history-delete" onClick={() => removeConversation(conversation.id)} aria-label={`Delete ${conversation.title}`}>×</button>
            </div>
          ))}
        </nav>

        <div className="stack-card">
          <div className="stack-title">Built with MERN</div>
          <div className="stack-grid">
            <span>MongoDB</span><span>Express</span><span>React</span><span>Node</span>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <h1>{active?.title || 'Conversation'}</h1>
            <p>Full-stack conversation workspace</p>
          </div>
          <div className="health-pill">
            <StatusDot health={health} />
            <span>{health?.database === 'mongodb-configured' ? 'MongoDB connected' : 'Demo database'}</span>
          </div>
        </header>

        <section className="chat-area" aria-live="polite">
          {active?.messages?.length ? (
            <div className="message-column">
              {active.messages.map((message) => (
                <article className={`message-row ${message.role}`} key={message.id}>
                  <div className="avatar">{message.role === 'assistant' ? <SparkMark /> : 'M'}</div>
                  <div className="message-body">
                    <div className="message-role">{message.role === 'assistant' ? 'Nexa' : 'You'}</div>
                    <p>{message.content}</p>
                  </div>
                </article>
              ))}
              {busy && (
                <article className="message-row assistant">
                  <div className="avatar"><SparkMark /></div>
                  <div className="message-body">
                    <div className="message-role">Nexa</div>
                    <div className="typing"><span /><span /><span /></div>
                  </div>
                </article>
              )}
              <div ref={endRef} />
            </div>
          ) : (
            <div className="empty-state">
              <div className="hero-mark"><SparkMark /></div>
              <h2>Build something worth showing.</h2>
              <p>This is a working MERN portfolio app—not a static mockup. Start a conversation to exercise the React UI, Express API, Node runtime, and MongoDB persistence layer.</p>
              <div className="prompt-grid">
                {starterPrompts.map((prompt) => (
                  <button key={prompt} onClick={() => sendMessage(prompt)}>{prompt}<span>↗</span></button>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="composer-wrap">
          {error && <div className="error-banner">{error}</div>}
          <form className="composer" onSubmit={onSubmit}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask about the project, architecture, or deployment…"
              rows="1"
              maxLength="12000"
            />
            <button type="submit" disabled={!input.trim() || busy} aria-label="Send message">↑</button>
          </form>
          <div className="composer-note">
            <span>{health?.assistant === 'openai' ? 'OpenAI responses enabled' : 'Portfolio demo assistant enabled'}</span>
            <span>Shift + Enter for a new line</span>
          </div>
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
