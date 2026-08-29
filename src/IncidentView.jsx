import React, { useEffect, useState } from 'react';

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
    getJson('/api/incident')
      .then(setStatus)
      .catch((err) => setError(String(err.message || err)));
  }, []);

  async function runDemo() {
    setBusy(true);
    setError('');
    try {
      setReport(await getJson('/api/incident?demo=true'));
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace-content incident-workspace">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SPLINTER 4 · PYTHON SPECIALIST</span>
          <h2>Incidents</h2>
          <p>Node/React orchestrates the product while the actual ForgeIncident Python workflow performs correlation, RCA, falsification, and remediation planning.</p>
        </div>
        <button className="refresh-button" onClick={runDemo} disabled={busy}>
          {busy ? 'Analyzing…' : 'Run demo RCA'}
        </button>
      </div>

      <div className="boundary-note">
        <strong>Cross-language boundary</strong>
        <span>Nexa sends one JSON IncidentInput contract to a Python FastAPI Vercel Function.</span>
        <span>ForgeIncident returns a typed IncidentReport. Nexa presents it; Nexa does not duplicate the specialist algorithm.</span>
      </div>

      <section className="specialist-status-card">
        <div className={`specialist-orb ${status?.status === 'ok' ? 'online' : ''}`}>PY</div>
        <div>
          <span>Specialist status</span>
          <h3>{status?.specialist || 'Connecting to ForgeIncident…'}</h3>
          <p>{status?.contract || 'IncidentInput → IncidentReport'}</p>
        </div>
        <div className="status-stack">
          <b>{status?.runtime || 'python'}</b>
          <small>{status?.context_mode || 'Checking runtime profile'}</small>
        </div>
      </section>

      {error && <div className="incident-error">{error}</div>}

      {!report ? (
        <section className="incident-empty">
          <div className="incident-timeline-demo">
            <div><b>00:00</b><span>deployment</span><p>checkout-api release completed</p></div>
            <div><b>+02m</b><span>metric</span><p>HTTP 5xx rate increased</p></div>
            <div><b>+03m</b><span>log</span><p>payment dependency timeout</p></div>
            <div><b>+04m</b><span>alert</span><p>error-budget burn triggered</p></div>
          </div>
          <h3>Run the built-in deployment-regression incident.</h3>
          <p>This proves the deployed Python graph can normalize signals, correlate events, rank hypotheses, attach evidence, generate falsifiers, and produce approval-aware remediation.</p>
          <button onClick={runDemo} disabled={busy}>{busy ? 'Running ForgeIncident…' : 'Analyze demo incident'}</button>
        </section>
      ) : (
        <>
          <div className="incident-summary-grid">
            <article><span>Severity</span><strong className={`severity-${report.severity}`}>{report.severity}</strong></article>
            <article><span>Status</span><strong>{report.status}</strong></article>
            <article><span>Affected services</span><strong>{report.affected_services?.length || 0}</strong></article>
            <article><span>Hypotheses</span><strong>{report.hypotheses?.length || 0}</strong></article>
          </div>

          <section className="command-section">
            <div className="section-title"><div><span>Incident report</span><h3>{report.title}</h3></div></div>
            <p className="incident-summary-copy">{report.summary}</p>
            <div className="context-mode-row">
              <span>Context mode</span>
              <code>{report.context?.mode || (report.context?.answer?.citations?.length ? 'grounded-repository' : 'signal-only')}</code>
              {report.context?.error && <small>Repository context unavailable in the lightweight function; deterministic signal RCA continued safely.</small>}
            </div>
          </section>

          <section className="command-section">
            <div className="section-title"><div><span>Ranked RCA</span><h3>Root-cause hypotheses</h3></div></div>
            <div className="hypothesis-list">
              {report.hypotheses?.map((item, index) => (
                <article className="hypothesis-card" key={`${item.title}-${index}`}>
                  <div className="hypothesis-head">
                    <div><span>Hypothesis {index + 1}</span><h4>{item.title}</h4></div>
                    <strong>{Math.round((item.confidence || 0) * 100)}%</strong>
                  </div>
                  <p>{item.explanation}</p>
                  <div className="hypothesis-columns">
                    <div><b>Evidence</b>{item.evidence?.map((ref, i) => <small key={i}>{ref.source_type}: {ref.detail}</small>)}</div>
                    <div><b>Falsifiers</b>{item.falsifiers?.map((text, i) => <small key={i}>{text}</small>)}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="command-section">
            <div className="section-title"><div><span>Authority boundary</span><h3>Remediation plan</h3></div></div>
            <div className="remediation-list">
              {report.remediation?.map((step, index) => (
                <article className="remediation-card" key={`${step.action}-${index}`}>
                  <div className="remediation-head"><strong>{step.action}</strong><span className={step.requires_human_approval ? 'approval-human' : 'approval-auto'}>{step.requires_human_approval ? 'Human approval' : 'Safe to automate'}</span></div>
                  <p>{step.rationale}</p>
                  <small><b>Verify:</b> {step.verification}</small>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
