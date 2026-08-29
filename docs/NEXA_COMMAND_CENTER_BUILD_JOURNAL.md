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

Add an engineering overview service that can query public GitHub repository metadata without exposing credentials. A `GITHUB_TOKEN` may optionally raise rate limits later, but the first version works for the public portfolio repositories without requiring a secret.

### Concept this teaches

**Evolutionary architecture.** Refactoring a working product is different from greenfield development. Preserve known-good behavior, introduce a stable shell, then migrate/integrate capabilities incrementally.

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
