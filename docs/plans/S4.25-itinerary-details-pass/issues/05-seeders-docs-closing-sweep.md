# 05 — Seeders, docs, and the closing sweep

Status: ready-for-agent

**What to build:** The harness and the canon catch up with the model, and the story earns its merge proposal. No product surface changes here.

**Blocked by:** 01 · 02 · 03 · 04.

- [ ] Seeder fixtures move to a single destination per trip and the derived region-append logic is deleted; the seeders' fail-loudly behavior is preserved (a fixture that no longer fits the wire fails naming itself, not silently).
- [ ] ADR-028's full text lands in the ADR log: the ADR-008 waiver (scalar destination shape · merge-patch semantics · owner-only details editing) and the two model moves (currency to the Itinerary, destination to a scalar), with the founder rulings and dates.
- [ ] Glossary: **Trip Currency** added; **Destination** re-scoped to singular.
- [ ] API conventions gain the merge-patch section (absent = keep, explicit null = clear) as the standing convention for clearable fields.
- [ ] Epic map: the four discharged lines closed; the clear-a-date line corrected (its recorded premise contradicted the shipped endpoint); the archive-affordance side-observation added as its own line.
- [ ] BUILD_STATUS gains the S4.25 row — status + spec link, nothing else — **in the last commit on the feature branch**.
- [ ] The pre-promotion-scale sweep, once: full backend ITs and full mobile suite with counts read from the `Tests run:` summaries, and `npm run smoke` (the whole Playwright suite, one exit code).
- [ ] Deployed-dev reseed is **not** run here — proposed separately and gated on its own explicit approval, per standing rule.

## Comments
