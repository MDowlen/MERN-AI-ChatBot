import React, { useEffect, useMemo, useState } from 'react';
import './premium-incidents.css';

async function getJson(url) {
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || body.error || `Request failed with ${response.status}`);
  return body;
}

export default function IncidentView() {
  const [status, setStatus] = useState(null);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getJson('/api/incident').then(setStatus).catch((err) => setError(String(err.message || err)));
  }, []);

  async function runDemo() {
    setBusy(true); setError('');
    try { setReport(await getJson('/api/incident?demo=true')); }
    catch (err) { setError(String(err.message || err)); }
    finally { setBusy(false); }
  }

  const signals = useMemo(() => report?.correlated_events?.flatMap((event) => event.signals || []) || [], [report]);
  const topHypothesis = report?.hypotheses?.[0] || null;

  return (
    <div className="premium-incidents">
      <div className="incident-head-premium">
        <div>
          <h1>Incidents</h1>
          <p>Correlate operational signals, rank root-cause hypotheses, expose falsifiers, and keep risky remediation behind explicit human approval.</p>
        </div>
        <button onClick={runDemo} disabled={busy}>{busy ? 'Analyzing…' : report ? 'Re-run demo RCA' : 'Run demo RCA'}</button>
      </div>

      <section className="specialist-strip">
        <div className={`orb ${status?.status === 'ok' ? 'online' : ''}`}>PY</div>
        <div><span>Python specialist</span><strong>{status?.specialist || 'Connecting to ForgeIncident…'}</strong><small>{status?.contract || 'IncidentInput → IncidentReport'}</small></div>
        <code>{status?.context_mode || 'checking runtime profile'}</code>
      </section>

      {error && <div className="incident-error-premium">{error}</div>}

      {!report ? (
        <section className="incident-demo-premium">
          <div className="demo-timeline">
            <article className="demo-event"><b>00:00</b><span>deployment</span><p>checkout-api release completed</p></article>
            <article className="demo-event"><b>+02m</b><span>metric</span><p>HTTP 5xx rate increased</p></article>
            <article className="demo-event"><b>+03m</b><span>log</span><p>payment dependency timeout</p></article>
            <article className="demo-event"><b>+04m</b><span>alert</span><p>error-budget burn triggered</p></article>
          </div>
          <h2>Deployment-regression RCA demo</h2>
          <p>This built-in scenario proves the deployed ForgeIncident graph can normalize signals, correlate events, rank hypotheses, attach evidence, generate falsifiers, and produce approval-aware remediation without pretending correlation is proof.</p>
        </section>
      ) : (
        <>
          <div className="incident-summary-strip">
            <article><span>Severity</span><strong className={`severity-${report.severity}`}>{report.severity}</strong></article>
            <article><span>Status</span><strong>{report.status}</strong></article>
            <article><span>Affected services</span><strong>{report.affected_services?.length || 0}</strong></article>
            <article><span>Leading confidence</span><strong>{topHypothesis ? `${Math.round((topHypothesis.confidence || 0) * 100)}%` : '—'}</strong></article>
          </div>

          <div className="context-mode-premium">
            <span>Context mode</span><code>{report.context?.mode || (report.context?.answer?.citations?.length ? 'grounded-repository' : 'signal-only')}</code>
          </div>

          <div className="incident-workgrid">
            <section className="incident-column">
              <header><span>Operational timeline</span><h2>{report.title}</h2></header>
              <div className="incident-timeline-list">
                {signals.map((signal, index) => (
                  <article className="incident-timeline-row" key={`${signal.kind}-${signal.timestamp}-${index}`}>
                    <time>{signal.timestamp ? new Date(signal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</time>
                    <i className={`kind-${signal.kind}`} />
                    <div><b>{signal.kind}</b><p>{signal.message}</p></div>
                  </article>
                ))}
              </div>
            </section>

            <section className="incident-column">
              <header><span>Ranked RCA</span><h2>Root-cause hypotheses</h2></header>
              <div className="hypothesis-stack-premium">
                {report.hypotheses?.map((item, index) => (
                  <article className="hypothesis-premium" key={`${item.title}-${index}`}>
                    <header><div className="hypothesis-rank">{index + 1}</div><h3>{item.title}</h3><div className="confidence">{Math.round((item.confidence || 0) * 100)}%</div></header>
                    <p>{item.explanation}</p>
                    <div className="confidence-bar"><i style={{ width: `${Math.round((item.confidence || 0) * 100)}%` }} /></div>
                  </article>
                ))}
              </div>
            </section>

            <aside className="incident-column">
              <header><span>Evidence inspector</span><h2>Evidence, falsifiers & actions</h2></header>
              <div className="evidence-drawer">
                {topHypothesis && (
                  <>
                    <div className="evidence-group"><strong>Evidence</strong>{topHypothesis.evidence?.map((ref, index) => <span className="evidence-item" key={index}><b>{ref.source_type}</b> · {ref.detail}</span>)}</div>
                    <div className="evidence-group"><strong>Falsifiers</strong>{topHypothesis.falsifiers?.map((text, index) => <span className="falsifier-item" key={index}>{text}</span>)}</div>
                  </>
                )}
                <div className="evidence-group">
                  <strong>Remediation plan</strong>
                  {report.remediation?.map((step, index) => (
                    <article className="remediation-premium" key={`${step.action}-${index}`}>
                      <header><strong>{step.action}</strong><span className={`approval-pill ${step.requires_human_approval ? 'human' : 'auto'}`}>{step.requires_human_approval ? 'Human approval' : 'Safe to automate'}</span></header>
                      <p>{step.rationale}</p><small>Verify: {step.verification}</small>
                    </article>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
