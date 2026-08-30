# Nexa Command Center Release Gate

Before merging PR #1 into `main`, verify:

- Node build and grounded smoke test pass on the exact PR head.
- Python ForgeIncident specialist contract passes on the exact PR head.
- Vercel preview for the exact feature head is READY.
- Command-center HTML shell returns HTTP 200.
- Repository/PR/deployment evidence endpoints return HTTP 200.
- Python incident specialist returns HTTP 200 and demo RCA executes.
- Preview runtime error/fatal query shows no new errors after QA.
- PR remains mergeable with `main`.
- Production remains untouched until this gate passes.

The release gate is intentionally documented because deployment readiness is evidence, not a feeling.
