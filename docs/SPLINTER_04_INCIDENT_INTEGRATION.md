# Splinter 4 — ForgeIncident Cross-Language Integration

This document is course source material. It captures the complete engineering path from design choice through failures, refactor, deployment, and verification.

## Goal

Make Nexa's Incident surface call the **real ForgeIncident Python workflow** without rewriting its logic in JavaScript.

The desired boundary is:

```text
React Incident UI
       |
       v
/api/incident
       |
       v
Python FastAPI Vercel Function
       |
       v
ForgeIncident run_incident(IncidentInput)
       |
       v
IncidentReport
       |
       v
React presents hypotheses / evidence / falsifiers / remediation
```

Nexa owns orchestration and presentation. ForgeIncident remains the RCA specialist.

## Why not rewrite ForgeIncident in Node?

Reimplementing the specialist in JavaScript would create two versions of the same algorithm:

```text
ForgeIncident Python logic
          X
Nexa JavaScript copy
```

Those implementations would drift. Fixes, evaluation changes, evidence rules, and safety boundaries would need to be maintained twice.

Instead, Nexa integrates through a stable JSON contract:

`IncidentInput -> IncidentReport`

This is a concrete example of service boundaries and cross-language integration.

---

## First implementation — mixed Vercel runtimes

Nexa already used a Node/Express Vercel Function at `api/index.js`.

We added:

- `api/incident.py` — FastAPI specialist adapter
- `requirements.txt` — Python dependencies
- a Vercel rewrite from `/api/incident` to the Python function

Vercel detected the deployment as a mixed runtime application:

```text
nodejs: 1 function
python: 1 function
```

This proved a single deployed product can contain language-specific serverless functions.

---

## Deployment Failure 001 — `LAMBDA_SIZE_EXCEEDED`

The first full specialist deployment failed during Vercel packaging.

### Failure

```text
Total bundle size: 643.27 MB
Vercel function limit: 500 MB
Error: LAMBDA_SIZE_EXCEEDED
```

The frontend itself built successfully. The failure occurred while packaging the Python function.

### Dependency evidence

The build logs showed that installing ForgeIncident also installed its unconditional ForgeContext dependency and ForgeContext's heavy transitive stack, including packages such as:

- Qdrant client / gRPC
- Tree-sitter language packs
- NumPy
- repository parsing dependencies

The incident function did not need that entire stack just to correlate supplied operational signals and produce deterministic RCA.

### Root cause

ForgeIncident had only one dependency profile:

```text
ForgeIncident
    -> ForgeContext
        -> Qdrant / Tree-sitter / parsing stack
```

A capability that was optional at runtime had been modeled as a mandatory package dependency.

### Important lesson

**Application architecture and package architecture are connected.**

A modular code design can still produce an oversized deployment if package dependencies are not similarly modular.

---

## Safe refactor — splinter ForgeIncident itself

We did not edit the known-good ForgeIncident `main` directly.

A new branch was created:

`feature/serverless-profile`

This applies the same safe splintering method used for Nexa.

### ForgeIncident v0.3.1 dependency profiles

The base package became lightweight:

```text
pydantic
typer
rich
langgraph
```

ForgeContext moved into an optional `context` extra.

The `dev` extra still installs ForgeContext so CI continues testing the complete grounded mode.

Conceptually:

```text
forge-incident              -> lightweight signal RCA
forge-incident[context]     -> repository-grounded RCA
forge-incident[dev]         -> full test environment
```

### Exact ForgeContext pin

The optional dependency is pinned to the exact known-green ForgeContext v0.3 commit rather than floating on `main`.

This improves reproducibility and prevents an unrelated ForgeContext commit from silently changing the serverless build.

---

## Lazy import design

Originally `nodes.py` imported `OperationalContext` at module import time.

That meant importing ForgeIncident effectively required ForgeContext to exist even if repository context was not needed.

The import moved inside `context_agent`:

```python
try:
    from .context import OperationalContext
    pack = OperationalContext().pack(...)
except Exception as exc:
    pack = {
        "error": str(exc),
        "mode": "signal-only",
        "answer": {"confidence": 0.0, "citations": []},
    }
```

### What this changes

Full profile:

```text
signals + ForgeContext -> grounded repository + operational RCA
```

Lightweight profile:

```text
signals -> deterministic correlation/RCA
context mode -> signal-only
```

The system degrades **explicitly**, not silently.

### Safety property

Missing repository context does not cause a fake grounded answer. The report records `signal-only` and context confidence stays unavailable/zero.

---

## ForgeIncident verification before reuse

The v0.3.1 serverless-profile branch ran the existing Python matrix with the **full `dev` profile**.

Python versions:

- 3.11 — success
- 3.12 — success
- 3.13 — success

Each lane successfully installed, ran Ruff, and ran pytest.

This is important: we did not reduce deployment size by reducing test coverage. CI still tests the richer context-enabled configuration.

The exact green commit used by Nexa is:

`8b6bf95db9a4b6486b610bb6fff7d168bafc71f0`

---

## Nexa deployment after lightweight pin

Nexa changed `requirements.txt` to install the exact green ForgeIncident v0.3.1 commit.

The next Vercel deployment became **READY**.

Vercel again detected:

```text
python: 1
nodejs: 1
```

The 643 MB bundle failure was eliminated.

### Course lesson

Do not solve platform size limits only by increasing limits or removing features. First ask whether the deployment is carrying capabilities it does not actually need.

---

## Runtime Failure 002 — platform route vs FastAPI route

The first request to:

`GET /api/incident`

returned HTTP 404 even though the Python function was successfully deployed.

### Diagnosis

Vercel routed the request to `api/incident.py`, but FastAPI still saw the public request path `/api/incident`.

The adapter only defined:

```python
@app.get("/")
```

So there were two routing layers:

```text
Vercel routing
    -> correct Python function

FastAPI routing
    -> no matching /api/incident path
```

### Fix

The adapter now supports both root and public paths:

```python
@app.get("/")
@app.get("/api/incident")
```

and the same pattern for POST.

### Verification

`GET /api/incident` returned HTTP 200:

```json
{
  "status": "ok",
  "specialist": "forge-incident",
  "contract": "IncidentInput -> IncidentReport",
  "runtime": "python",
  "context_mode": "signal-only unless ForgeContext extra is installed"
}
```

### Course lesson

**Infrastructure routing and application-framework routing are separate layers.**

A request can reach the correct function and still 404 inside the framework.

---

## Deployed workflow self-test

A deterministic demo incident was added to the GET endpoint behind:

`/api/incident?demo=true`

The demo represents:

```text
00:00 deployment completes
+02m  HTTP 5xx metric rises
+03m  payment dependency timeout log
+04m  error-budget alert fires
```

This lets deployment QA execute the real graph with a normal GET request instead of merely testing that Python imports succeed.

### Runtime verification result

The deployed preview returned HTTP 200 and produced:

- severity: `high`
- affected service: `checkout-api`
- leading hypothesis: `Recent deployment correlated with failure onset`
- leading confidence: `0.82`
- explicit evidence
- explicit falsifiers
- remediation steps
- rollback/traffic-shift step marked `requires_human_approval=true`
- context mode: `signal-only`

### Critical distinction

The report says the recent deployment is **correlated** with failure onset. It does not promote correlation to proven causation.

Its falsifiers include conditions such as:

- errors began before deployment
- rollback fails to improve signals
- an independent dependency failed first

This is the evidence discipline ForgeIncident was designed to enforce.

---

## Incident UI

New files:

- `src/IncidentView.jsx`
- `src/incidents.css`

The Incident page shows:

- Python specialist status
- execution profile/context mode
- built-in timeline
- severity and affected services
- ranked hypotheses and confidence
- evidence
- falsifiers
- remediation
- human approval vs safe-to-automate badges

The UI calls the specialist; it does not contain the RCA algorithm itself.

---

## Multi-runtime CI

Once Nexa became a mixed-language product, one CI job was no longer enough.

The workflow now has two responsibilities:

```text
Node lane
  -> npm install
  -> Vite build
  -> Express smoke contract

Python specialist lane
  -> pip install -r requirements.txt
  -> build IncidentInput
  -> execute run_incident()
  -> assert hypotheses/remediation
  -> assert lightweight signal-only mode
```

### Course principle

**A repository is not a runtime boundary.**

One repository can contain multiple runtimes, and each runtime needs an appropriate verification strategy.

---

## Interview explanation

> “When I integrated ForgeIncident into Nexa, I kept the Python specialist intact rather than porting it to Node. I exposed it as a FastAPI serverless function with the same IncidentInput-to-IncidentReport contract. The first deployment exceeded Vercel's function size limit because ForgeIncident pulled in the full ForgeContext stack unconditionally. I refactored ForgeIncident into lightweight and context-enabled dependency profiles, lazy-loaded repository context, ran the full Python 3.11–3.13 CI matrix, and pinned Nexa to that exact green commit. After that, the mixed Node/Python deployment succeeded. I also caught a second issue where Vercel correctly routed to the function but FastAPI's internal path did not match, which reinforced the distinction between platform routing and application routing.”

## Concepts taught by this splinter

- cross-language service boundaries
- typed JSON contracts
- mixed-runtime serverless applications
- dependency-profile design
- optional dependencies
- lazy imports
- bundle-size debugging
- exact commit pinning
- graceful capability degradation
- framework routing vs platform routing
- deterministic deployment self-tests
- multi-runtime CI
- authority boundaries for production remediation
