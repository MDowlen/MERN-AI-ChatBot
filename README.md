# Nexa — AI Engineering Command Center

Nexa is a production **AI engineering command center** that evolved from a MERN conversation workspace into a mixed-runtime operational engineering product. It unifies repository visibility, deterministic pull-request risk, deployment evidence, incident RCA, persistent engineering conversations, system health, and context-aware AI assistance.

**Live app:** https://mern-ai-chat-bot-one.vercel.app

## What Nexa does

- **Overview** — summarizes the Nexa + Forge engineering ecosystem.
- **Repositories** — reads current repository metadata and latest commits.
- **PR Risk** — surfaces deterministic file-count, code-churn, and CI facts while keeping ForgePR semantic review as a separate specialist boundary.
- **Deployments** — maps source commits to preview/production release evidence and explicitly handles pagination/sampling assumptions.
- **Incidents** — invokes a real Python ForgeIncident workflow for signal correlation, RCA hypotheses, evidence, falsifiers, and approval-aware remediation.
- **Conversations** — preserves MongoDB-backed persistent engineering chat history.
- **System Health** — verifies the application and MongoDB dependency state.
- **Ask Nexa** — grounds chat against the selected workspace surface; the browser sends intent while the server independently rebuilds authoritative evidence.

## Production architecture

```text
                         NEXA COMMAND CENTER

React + Vite UI
      |
      +--> repositories / PRs / deployments / health
      |                |
      |                v
      |          Express 5 / Node.js
      |             /        \
      |            v          v
      |       GitHub APIs   MongoDB Atlas
      |            |
      |            v
      |     server-grounded context
      |            |
      +----------> OpenAI Responses API
      |
      +--> /api/incident
                 |
                 v
          FastAPI / Python
                 |
                 v
          ForgeIncident v0.3.1
```

Vercel deploys both Node.js and Python functions in the same project.

## Specialist boundaries

Nexa intentionally does not duplicate every specialist algorithm.

```text
Nexa         = product surface + discovery + orchestration + presentation
ForgeContext = grounded repository intelligence
ForgePR      = semantic PR review + test-generation specialist
ForgeIncident= evidence-backed incident/RCA specialist
```

A core design rule is **observable facts and AI judgment are not the same thing**. GitHub/API-derived values such as changed-file count, code churn, CI state, or deployment SHA are treated as deterministic evidence. Model explanations and causal recommendations remain advisory unless separately verified.

## Context-aware Ask Nexa

The client sends only the selected workspace intent:

```json
{
  "content": "What does the current PR evidence tell me?",
  "workspace": {
    "surface": "pr-risk"
  }
}
```

The Express server then rebuilds the current evidence itself before calling the assistant. This keeps client state from becoming the source of truth for engineering decisions.

## Cross-language incident integration

The Incident surface sends an `IncidentInput` JSON contract to a Python FastAPI function. That function executes ForgeIncident and returns a typed `IncidentReport` containing:

- normalized/correlated signals
- ranked root-cause hypotheses
- confidence values
- evidence references
- falsifiers
- remediation steps
- explicit human-approval requirements

The current serverless profile runs lightweight signal-based RCA. ForgeContext repository grounding remains an optional heavier ForgeIncident profile.

## Engineering failures captured during the build

This project intentionally preserves its build journal and splinter documentation because the failures are part of the engineering story:

- GitHub Actions npm caching failed because the repo had no lockfile; CI was corrected rather than misdiagnosing application code.
- Deployment evidence initially missed production due to a preview-heavy pagination sample; production is now queried independently.
- The first ForgeIncident Python bundle was **643 MB**, exceeding Vercel's 500 MB function limit; ForgeIncident v0.3.1 introduced a lightweight serverless dependency profile.
- The first Python route returned 404 because Vercel routing and FastAPI routing were mismatched.
- An intermediate frontend commit imported a stylesheet before the file existed, proving why compile-time dependencies should land atomically under continuous deployment.
- The release-gate smoke test hit GitHub's unauthenticated shared-runner rate limit; CI now uses GitHub Actions' ephemeral `GITHUB_TOKEN` only for the smoke-test process.

See `docs/` for the detailed build/course source material.

## CI

GitHub Actions has two independent lanes:

```text
Node lane
checkout -> Node 24 -> npm install -> Vite build -> grounded smoke test

Python lane
checkout -> Python 3.12 -> lightweight ForgeIncident install -> specialist contract test
```

The smoke test validates health, repository overview, PR/deployment evidence contracts, conversation persistence, and workspace-grounded chat behavior.

## API surface

### Engineering

- `GET /api/health`
- `GET /api/engineering/overview`
- `GET /api/engineering/prs`
- `GET /api/engineering/deployments`
- `GET /api/incident`
- `GET /api/incident?demo=true`
- `POST /api/incident`

### Conversations

- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/:id`
- `DELETE /api/conversations/:id`
- `POST /api/conversations/:id/messages`

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

For the JavaScript application, the React frontend runs through Vite and proxies `/api` to the local Express server. The deployed Python ForgeIncident adapter is a Vercel function and has dependencies listed in `requirements.txt`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas conversation persistence |
| `OPENAI_API_KEY` | Live Ask Nexa model responses |
| `OPENAI_MODEL` | Optional model override |
| `GITHUB_TOKEN` | Optional higher GitHub API limits; CI uses its ephemeral Actions token |
| `PORT` | Local Express API port |

Credentials remain server-side; no API keys belong in the browser or repository.

## Verification

```bash
npm run build
npm run check
```

Production verification additionally checks the live Vercel deployment, MongoDB-connected health, GitHub engineering evidence, Python incident execution, and runtime error logs.

## Repository

Source: https://github.com/MDowlen/MERN-AI-ChatBot

## License

MIT © 2026 Mareza Dowlen
