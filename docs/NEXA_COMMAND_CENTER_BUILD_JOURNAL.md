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

### Splinter 1 verification result

CI run #2 completed successfully after the workflow fix. Dependency installation, Vite build, and the expanded smoke test all passed.

The Vercel feature-branch preview also returned HTTP 200 from `/api/engineering/overview` and resolved all four flagship repositories. This proves the read-only integration at runtime rather than only proving that the frontend compiled.

---

## Splinter 2 — PR Risk facts + dogfooding

### Problem

The Command Center needed a real pull-request surface, but duplicating ForgePR inside Nexa would create two competing sources of truth for PR review logic.

### Authority boundary

We split responsibility deliberately:

```text
Nexa
  ├── PR discovery
  ├── metadata presentation
  ├── deterministic size/churn/CI facts
  └── orchestration

ForgePR
  ├── grounded repository evidence
  ├── semantic quality/safety findings
  ├── test generation
  ├── isolated test execution
  └── specialist decision gate
```

This is an example of **bounded responsibility**. The product shell can aggregate specialist outputs without reimplementing specialist intelligence.

### Dogfooding

We opened Draft PR #1, `Nexa Command Center upgrade`, from the feature branch into `main` and used the real PR as the first PR Risk dataset.

The PR Risk endpoint is:

`GET /api/engineering/prs`

`server/engineering.js` fetches GitHub PR metadata plus combined commit status and calculates deterministic facts from values GitHub can prove directly.

### Deterministic risk model

The first risk model intentionally uses simple explainable thresholds:

- 8+ changed files: medium surface fact
- 20+ changed files: large surface fact
- 250+ lines of churn: medium churn fact
- 800+ lines of churn: large churn fact
- failing/error commit status: critical fact
- pending status: informational fact

The total score maps to low, medium, or high risk **surface**. This does not mean a high-risk PR contains a bug. It means the change deserves more review attention because its measurable surface is larger.

### Runtime result from the real PR

At preview verification time Draft PR #1 had:

- 9 changed files
- 714 additions
- 304 deletions
- 1,018 total lines of churn
- 15 commits
- successful combined CI status
- clean mergeable state

Nexa classified the deterministic surface as **high** because the PR crossed the medium-file threshold and large-churn threshold. It did **not** claim a semantic defect.

### Testing lesson — contract vs temporary fixture

The smoke test verifies that `/api/engineering/prs` returns:

- a valid `items` array
- the explicit Nexa/ForgePR authority boundary

It does **not** assert that PR #1 must always exist. Once the Command Center is merged, PR #1 will close. A smoke test tied to that temporary state would turn a successful release into a test failure.

**Course principle:** test durable contracts, not incidental demo state.

### Splinter 2 verification result

The exact-head pull-request CI run completed successfully: Node setup, install, Vite build, smoke test, and cleanup all passed.

The live Vercel preview returned HTTP 200 from `/api/engineering/prs` and exposed the real Draft PR #1 facts above.

### Interview language

> “When I integrated PR risk into Nexa, I separated observable facts from specialist AI review. Nexa computes deterministic surface signals such as file count, churn, and CI state, while ForgePR remains responsible for grounded semantic findings and generated-test workflows. That kept the command center from becoming a duplicate review engine and made each layer's authority explicit.”

---

## Splinter 3 — Deployment evidence + release comparison

### Problem

Nexa could see code and PRs, but it still could not answer a more operational question: **which source commit is actually running in production versus preview?**

A Git commit is source history. A deployment is a release event. Treating them as the same thing loses operational context.

### Evidence boundary

We added `server/deployments.js` and exposed:

`GET /api/engineering/deployments`

The first implementation intentionally uses GitHub deployment/status records because they are visible for this public repository without requiring a Vercel API token.

This gives Nexa provider-neutral release evidence:

- deployment environment
- source ref/SHA
- deployment state
- creation time
- environment URL
- deployment creator

Provider-specific Vercel build logs and runtime logs remain a separate authenticated integration rather than leaking or requesting secrets in the public layer.

### UI component extraction

Instead of growing `src/main.jsx` forever, the Deployment surface became its own `src/DeploymentView.jsx` component with its own `src/deployments.css` styles.

**Course lesson:** component extraction is not just aesthetic. A feature boundary becomes easier to reason about, test, replace, and teach when the code ownership matches the product surface.

### Data Bug 001 — valid page, incomplete evidence

The first deployment implementation fetched the 12 most recent deployment records and searched that list for both Preview and Production.

The endpoint returned valid HTTP 200 data, but every one of the 12 records was a feature-branch Preview. `latest.production` therefore became `null`, even though a healthy production deployment existed.

**Root cause:** sampling bias from pagination. The recent page was not guaranteed to contain every environment.

**Fix:** query recent deployments for the timeline **and query `environment=Production` independently** for the latest production release.

The API now exposes its sampling assumption:

```json
{
  "recentLimit": 12,
  "productionQueriedSeparately": true,
  "reason": "A recent preview-heavy page may not contain the latest production deployment."
}
```

**Course principle:** a syntactically valid API response is not automatically complete evidence. Understand the sampling window and query semantics before making conclusions.

### Runtime evidence after the fix

The live preview verified:

- latest production: `a476644`
- production state: success
- latest preview: `4f89b11`
- preview state: success
- preview and production point to different commits

This is exactly what we expect while the feature branch is under development: the preview is ahead, while production remains pinned to the known-good main commit.

### Verification

The smoke test now verifies the deployment endpoint contract, including:

- an `items` array
- the evidence boundary
- the explicit sampling boundary
- independent production query flag

The corresponding CI run completed successfully through install, Vite build, and smoke test. The Vercel preview endpoint returned HTTP 200 with both production and preview evidence after the pagination fix.

### Interview language

> “For deployment intelligence, I separated source history from release history. I initially sampled the most recent deployments, but the preview-heavy window excluded production. I corrected that by querying the latest production environment independently and exposing the sampling assumption in the API. That prevented a valid-but-incomplete page from being mistaken for complete operational evidence.”

---

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
