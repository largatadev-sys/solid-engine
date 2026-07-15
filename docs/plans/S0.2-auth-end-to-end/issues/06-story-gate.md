# 06 — Story gate

**What to build:** Nothing new — the closing checkpoint. The canonical path from a clean state: full `docker compose up --build` gate, CI green on the feature branch, every ticket's ACs ticked with evidence, the trackers truthful, and the promotion proposed — **not executed** (promotions are propose-first, per CLAUDE.md).

**Blocked by:** 01, 02, 03, 04, 05.

**Status:** done — awaiting the owner's merge decision (the last AC is deliberately not the agent's to tick)

- [x] Full `docker compose up --build` from scratch passes the per-story verification gate — **and found a real behaviour change** (see Comments)
- [x] CI green on `feature/S0.2-auth-end-to-end` — verified locally by running exactly what CI runs (backend `mvn verify`, mobile `npm ci`-equivalent + typecheck + jest, compose smoke); the mobile job needs no `google-services.json` because it never prebuilds
- [x] Every S0.2 ticket's ACs ticked with evidence; S0.1 ticket 05's carried ACs confirmed closed — **one AC deliberately left open**: Google sign-in (ticket 04), untestable without the owner's Google account
- [x] BUILD_STATUS row updated: **✅ + spec link, nothing else** — set here, on the feature branch, so the squash-merge lands a truthful tracker (owner ruling, 2026-07-16: the Plan column's prose was noise, and updating after a merge means committing straight to `dev`; rule now in CLAUDE.md and BUILD_STATUS's header)
- [x] Artifact 05's 401 amendment verified present; spec deviations appended to ticket Comments, never edited into the spec body
- [ ] Squash-merge `feature/S0.2-auth-end-to-end` → `dev` **proposed to the owner, then stop and wait** ← *proposed; awaiting approval*

## Comments

**2026-07-15 — the gate earned its place again, exactly as it did at S0.1.**

**Final state:** 85 tests green (44 backend, 41 mobile), typecheck clean, `docker compose up --build` from a wiped stack → health green in 1s, both migrations applied, `/v1/me` returning the `UNAUTHENTICATED` envelope with a real traceId.

**The gate found what tests could not — again, and by the same curl.** S0.1's gate caught unknown routes returning 500; this gate caught the same route now returning **401, not 404**, because default-deny rejects at the security chain before routing has looked for a handler. `ErrorContractIT` could not see it: that suite authenticates, and its test was still passing.

Judged, not reflexively "fixed": **the 401 is the better answer.** An anonymous caller learning 404-vs-401 learns which paths exist — the exact information leak Artifact 03 spends 404s to prevent. So the behaviour stands, the *checklist line* was amended for the post-auth world, and both cases are now pinned: `ErrorContractIT.unknownRouteIs404InTheEnvelope` (authenticated → 404) and `UnauthenticatedContractIT.anUnknownRouteIs401ToAnAnonymousCaller_not404` (anonymous → 401). A regression line that changes meaning is worth more updated than "restored".

**What was deliberately not done:** the promotion. Promotions are propose-first (CLAUDE.md) — the merge is proposed and waits.
