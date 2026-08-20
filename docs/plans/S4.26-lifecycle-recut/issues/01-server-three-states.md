# 01 — The server speaks three states

**What to build:** Every trip is born `upcoming` — created or forked — and walks the one-way ladder `upcoming → ongoing → completed` with nothing before it: `finish-planning` refuses forever with its named 409 (the route stays mapped — ADR-008 dormancy), `reopen` keeps working but floors at `upcoming`, and a stale client asking the trips listing for `category=draft` gets 200-and-empty rather than a 400 (the category constant stays; the state constant dies). Existing `DRAFT` rows are remapped to `UPCOMING` in the same change — **inseparably: once the enum drops `DRAFT`, an unremapped row is unreadable**, so V36 and the enum move together. The listing response gains the additive `dayCount` the Trips card's sub-line renders (founder ruling 2026-08-20 on the digest's conflict — option (a)). The 29 IT files whose fixtures call `finishPlanning` re-anchor to born-`upcoming`; none deleted, none weakened.

**Blocked by:** None — can start immediately.

**Owner gate (stop rule):** the V36 remap rewrites data beyond additive tables — **the migration file is proposed to the owner before it runs anywhere**, per the spec's decision 5.

**Status:** ready-for-agent

- [ ] Create and fork both answer `state: upcoming`; no code path — create, fork, remap — can produce `draft` (IT)
- [ ] `finish-planning` answers the named 409 in every state, owner included; the route stays mapped (IT)
- [ ] `reopen` steps `completed → ongoing → upcoming` and answers the named 409 at `upcoming` (IT)
- [ ] `category=draft` answers 200 with an empty page; the other three categories filter unchanged (IT)
- [ ] V36 remaps every `DRAFT` row to `UPCOMING` (uppercase — the `@Enumerated(STRING)` storage contract); the migration-stepping IT (own container, `.target(V35)`, raw-SQL legacy seed) passes, and a sabotage run under `mvn -o test-compile failsafe:integration-test` was seen to fail first — both stated in the write-up
- [ ] The migration file was proposed to the owner before running against any environment
- [ ] The trips listing carries additive `dayCount` per row; the detail response is unchanged (IT)
- [ ] The publish gate (`completed`) and the freeze (`published` alone) are untouched — existing ITs re-anchored, none deleted or weakened
- [ ] The diary gate is untouched: `upcoming` refuses capture, `ongoing`/`completed` accept — existing family re-anchored
- [ ] The full backend IT suite is green, counts read from the `Tests run:` summary, never the exit code
