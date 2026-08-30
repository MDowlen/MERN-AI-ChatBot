# Splinter 5 — Context-Aware Ask Nexa

## Why this splinter existed

After the first four Command Center splinters, Nexa had real repository, PR, deployment, incident, conversation, and health surfaces, but chat was still conceptually separate from those surfaces.

A generic assistant sitting next to engineering dashboards is not yet a command center. The chat needed to know **which evidence domain the engineer was asking about** without trusting browser-supplied facts.

## Core architecture decision

The client supplies intent. The server supplies authority.

```text
React surface
   |
   | workspace.surface = "pr-risk"
   | (intent only)
   v
Express message endpoint
   |
   v
buildCommandContext("pr-risk")
   |
   | fresh server-side GitHub/API evidence
   v
Nexa assistant
```

The browser does **not** send file counts, CI status, deployment SHAs, risk scores, or other engineering facts as authoritative model context. It only identifies the workspace surface.

The server reconstructs current evidence from the same backend integrations used by the visible dashboard.

## Backend files

### `server/commandContext.js`

This is the evidence adapter between product surfaces and the assistant.

Supported surfaces:

- overview
- repositories
- pr-risk
- deployments
- incidents
- conversations
- health

It creates compact, model-friendly evidence while preserving the authority boundary between deterministic API facts and advisory model judgment.

### `api/index.js`

The message endpoint now accepts:

```json
{
  "content": "What does the current PR evidence tell me?",
  "workspace": {
    "surface": "pr-risk"
  }
}
```

Before calling the assistant it runs `buildCommandContext(surface)` on the server.

The response returns the surface that was actually used:

```json
{
  "workspace": {
    "surface": "pr-risk",
    "generatedAt": "..."
  }
}
```

This lets the UI show the user what grounding domain was used instead of hiding that decision.

## Frontend handoff

`src/main.jsx` now owns a `contextSurface` state.

When the user selects **Ask Nexa** from PR Risk, Deployments, Incidents, Repositories, or Health, React remembers that source surface and switches to Conversations.

The message body sends only:

```js
workspace: { surface: contextSurface }
```

The chat UI displays a visible grounding bar such as:

`Grounding context · PR Risk`

with the note:

`Client sends intent only · server rebuilds evidence`

After the server responds, the UI can also show when the authoritative workspace context was regenerated.

## Why this is safer than sending dashboard state to the model

Client-side state can be stale, manipulated, partially loaded, or derived from a different API response than the backend currently considers authoritative.

By making the server rebuild evidence:

1. the model receives current backend evidence;
2. the UI cannot invent engineering facts merely by changing JavaScript state;
3. the same evidence-building logic is reusable by other clients;
4. assistant answers can be traced to a named evidence surface.

**Course rule:** client state expresses user intent; server-side systems establish truth for security-sensitive or decision-relevant facts.

## Durable contract test

The Node smoke test now sends a real workspace-grounded message:

```json
{
  "content": "What does the current PR evidence tell me?",
  "workspace": { "surface": "pr-risk" }
}
```

The test fails unless:

- the request succeeds;
- a conversation response is persisted;
- `workspace.surface` comes back as `pr-risk`;
- the demo assistant response demonstrates that PR deterministic evidence was actually used.

This tests the integration contract rather than merely checking that chat returned any text.

## CI result

The exact-head GitHub Actions run completed successfully in both runtime lanes:

```text
Node lane
checkout -> Node 24 -> npm install -> Vite build -> grounded smoke test -> success

Python lane
checkout -> Python -> install lightweight ForgeIncident -> contract verification -> success
```

## Deployment Failure 004 — dependent files committed separately

The React handoff commit imported:

```js
import './context.css';
```

but the stylesheet was added in the immediately following commit.

Vercel deploys every pushed commit independently. The intermediate commit therefore failed with:

```text
[UNRESOLVED_IMPORT] Could not resolve './context.css' in src/main.jsx
```

The application logic was not defective; the Git history temporarily contained a state that could not build.

The follow-up commit added `src/context.css`, and both CI and Vercel succeeded.

### Lesson

When multiple files form one compile-time dependency, they should ideally be committed atomically. A branch is allowed to evolve, but continuous deployment means **every pushed commit may become a build candidate**.

This is different from a runtime dependency failure: Vite caught the missing module during bundling before the application could deploy.

## Preview verification

Exact preview head:

`f60d5392610bbb67bbade82ea07f3dc2b7090a61`

The Vercel preview became READY with both Node and Python runtimes.

Verification included:

- command-center document shell: HTTP 200
- PR evidence endpoint: HTTP 200
- current PR combined status: success
- current preview runtime error/fatal query: no matching logs
- GitHub Actions Node lane: success
- GitHub Actions Python lane: success

At this verification point, PR #1 had grown to 21 changed files and 2,388 lines of churn. Nexa correctly labeled that as a **high review surface**, which means large change scope—not proof of a defect.

## Interview explanation

> “I made Nexa context-aware without trusting client-side dashboard state. The React app sends only the current workspace surface, then the Express server independently rebuilds PR, deployment, repository, or health evidence and passes that structured context to the model. The response includes the grounding surface so the UI can make the evidence domain visible. This gave the assistant useful operational context while keeping the server as the source of truth.”

## Concepts for the course

- context-aware AI interfaces
- client vs server trust boundaries
- evidence adapters
- structured grounding context
- stale-client-state risk
- contract testing
- multi-runtime CI
- continuous deployment semantics
- atomic commits for compile-time dependencies
- deterministic facts vs model judgment
