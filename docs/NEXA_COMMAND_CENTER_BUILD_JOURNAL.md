# Nexa Command Center Build Journal

This journal is intentionally part of the product. It records the engineering trail that will later become course material.

## Why we splintered from production

Production Nexa was already working as a MERN + AI conversation workspace. Rebuilding directly on `main` would mix experimental architecture work with a known-good deployment.

We created:

`feature/nexa-command-center`

This protects production while allowing a larger product refactor. The branch is the concrete example used to teach Git branching, risk isolation, iterative product design, preview deployments, and merge discipline.

## Starting architecture

```text
React conversation UI
      |
      v
Express API
  |       |
  v       v
MongoDB  OpenAI
```

The original app already proved client/server flow, conversation persistence, model integration, runtime health, and Vercel deployment.

## Target architecture

```text
                         NEXA COMMAND CENTER

GitHub repos / PRs / CI / deployments / incidents / conversations
                              |
                              v
                    React engineering workspace
                              |
                              v
                         Express API
                 /            |             \
                /             |              \
      engineering data    conversations      health
             |                 |               |
             v                 v               v
         GitHub APIs        MongoDB        dependencies
             |
     +-------+--------+
     |                |
ForgeContext        specialists
                   /           \
              ForgePR      ForgeIncident
```

Nexa becomes the product surface/orchestrator. ForgeContext remains the grounded repository-intelligence foundation. ForgePR remains the code-change specialist. ForgeIncident remains the operational-failure specialist.

## Splinter 1 — Command Center shell + engineering overview

### Goal

Turn the single-purpose chat layout into a multi-view engineering workspace without deleting the working conversation feature.

### New visible surfaces

- Overview
- Repositories
- PR Risk
- Deployments
- Incidents
- Conversations
- System Health

### Backend addition

`server/engineering.js` adds a read-only engineering overview service. It queries public GitHub metadata for Nexa, ForgeContext, ForgePR, and ForgeIncident. `GITHUB_TOKEN` is optional and used only to raise API limits if configured later.

`api/index.js` exposes the data at:

`GET /api/engineering/overview`

The existing conversation and health endpoints remain compatible.

### Frontend addition

`src/main.jsx` now owns a stable Command Center shell. The Conversations surface retains the original persistent chat behavior while Overview, Repositories, PR Risk, Deployments, Incidents, and System Health gain explicit UI boundaries.

PR Risk, Deployments, and Incidents are intentionally scaffolded before their specialist integrations are wired. That makes each later integration an incremental change instead of another whole-UI rewrite.

### Concept this teaches

**Evolutionary architecture.** Refactoring a working product is different from greenfield development. Preserve known-good behavior, introduce a stable shell, then migrate/integrate capabilities incrementally.

### Verification expansion

The original smoke test verified only health + conversation flow. Splinter 1 extended it to also verify that the engineering overview returns the four flagship repositories.

We also added the repository's first GitHub Actions workflow so branch changes now run:

```text
checkout -> Node setup -> dependency install -> Vite build -> smoke test
```

### CI Failure 001 — cache configuration without a lockfile

The first CI run failed before application code executed.

**Observed failure:** `actions/setup-node` reported that no dependency lockfile existed. The workflow requested `cache: npm`, which expects `package-lock.json`, `npm-shrinkwrap.json`, or another supported lockfile. The same workflow also attempted `npm ci`, which is specifically a clean install from a lockfile.

**Diagnosis:** environment/tooling configuration failure, not React/Express application failure.

**Fix for this splinter:** remove lockfile-dependent npm caching and use `npm install` because the repository currently has no lockfile.

**Why not hide the issue by inventing a lockfile?** A lockfile is a real reproducibility decision. We will add one deliberately in a later hardening splinter and study exactly what changes when dependency resolution becomes pinned.

**Course lesson:** CI stages have prerequisites. A failed pipeline step should first be classified by layer: checkout, runtime setup, dependency resolution, build, test, or application runtime. Do not debug application code when the pipeline never reached it.

### Risk controls

- Production `main` remains unchanged.
- Existing conversation endpoints stay compatible.
- MongoDB persistence stays intact.
- The engineering overview is read-only.
- No repository mutation is introduced in this splinter.

## Course capture checklist

For every future splinter, record:

1. What problem triggered the change?
2. What architecture existed before?
3. What did we change?
4. Which files own the behavior?
5. What could have broken?
6. How did we test it?
7. What did CI/deployment reveal?
8. What engineering concept does the change teach?
9. What interview question can be answered from this change?
