# 04 — Walks: the Playwright spec and the device pass

**What to build:** the verification rungs above Jest/ITs — one Playwright spec in the H1 suite driving the whole flow on the preview container, and the emulator walk notes for the device pass.

**Blocked by:** 03 (the surfaces it drives).

**Status:** needs-triage

- [ ] `e2e/web/polls.spec.ts` in the H1 suite (`npm run smoke:web -- e2e/web/polls.spec.ts` while iterating; the whole suite before the promotion proposal). Pool identities per the standing rule — **state the cast in the write-up** (t1 = creator/owner, t2 = second voter).
- [ ] The walk, entering through the affordance (the S4.18 lesson — never deep-route past the door): t1 opens the trip workspace → Polls tab → empty state → creates a poll (2 options, default deadline) → votes. t2 signs in, sees the poll and t1's attributed vote **before voting**, votes the other option, then **changes** their vote (the two-grammar states asserted). t1 closes early via the kebab → CLOSED badge + winner starred. Delete path: create a second poll, delete it through the confirm — the dialog wording is printed by the fixture (H1 auto-accepts and reports).
- [ ] Negative probes with discriminating outcomes (the indistinguishable-outcomes rule): a non-member's board GET answers not-found (assert the **code**, not just status family) · a vote on the closed poll refuses with its named code · the 26th open poll / 11th option refuse with theirs.
- [ ] Seeded data: `seed-trip.js --owner t1 --members t2` is enough — no new seeder; polls are created through the walk itself (invitations by-handle, no mail spend).
- [ ] Emulator pass (dev build, Metro): the same flow by hand — screenshot the recorded-vote state, the changing state, and a closed tie; watch the two standing traps (LogBox banner over docked CTAs; screenshot-before-tap on the delete confirm).
- [ ] Confirm the board's API requests are all `bearer` in the driver's request log (the ANON-GET tell).
