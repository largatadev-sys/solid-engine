# 03 — Profile + handles

**Status:** done

**What to build:** the create-profile step — avatar (Google photo imported, initials otherwise; no upload affordance until S3.3), display name, required @handle with live availability feedback, optional bio — plus the client-side routing gate: any signed-in traveler without a handle is routed into onboarding, exactly once, existing accounts included. The me screen gains an Edit profile entry reusing the same step. A Google sign-up can complete this end-to-end without ticket 02 existing, which is why the two run in parallel.

**Blocked by:** 01 — palette + front-door restructure. *(Parallel with 02 — the Google path reaches this step without OTP.)*

- [x] Additive migration: handle (nullable, unique case-insensitively) + profile columns; all existing rows stay legal (spec, backend scope)
- [x] Handle rules enforced: format, reserved words, case-insensitive duplicates refused, availability endpoint truthful, prefilled collision-free suggestion (spec decision 4, AC 4)
- [x] Handle change releases the old handle immediately — claimable by another account; ids remain the key everywhere (ADR-015; spec AC 4)
- [x] The uniqueness constraint's semantics are pinned by a sabotage-verified test (spec AC 5)
- [x] Google path prefills display name + photo; email path gets the initials avatar; no dead upload control anywhere (spec decisions 3, 8)
- [x] **Negative control:** an un-onboarded traveler exercises the core /v1 surface successfully — no endpoint refuses on incompleteness (spec decision 11, AC 6)
- [x] Routing gate: fresh account routed in order; completed account never re-prompted; an existing NULL-handle account routed exactly once (spec AC 7)
- [x] The me screen's Edit profile entry reuses the profile step (spec decision 4; owner-approved at the ticket quiz)

## Comments

**2026-07-30 — implemented, alongside 02 and 04 (one migration, one flow).**

1. **The uniqueness constraint is written as the thing it means, and the choice is the point.** `UNIQUE (handle)` beside `CHECK (handle = lower(handle))` would enforce identical behaviour *through the application* — and would be **untestable**, because with the CHECK in place no mixed-case row can exist for the uniqueness to disagree about. Two indistinguishable outcomes: the class of non-check this repo has been burned by three times. Written as `lower(handle)` it has a failure mode you can trip. Sabotage-verified: reverting the index to a plain `(handle)` fails exactly the two case-sensitivity assertions in `TravelerHandleStorageIT` and leaves the other three green.
2. **The Google photo was missing until the device showed it.** Decision 3 asks for "display name **and photo** prefilled". The name arrived (the `name` claim was already read); the photo did not, because nothing read `picture`. Caught on the emulator — the avatar rendered initials where a Google photo belonged. `TravelerClaims` now carries it and it lands at provisioning only, so a traveler's own later choice is never overwritten.
3. **The routing gate is a pure function, and its no-loop property is a test.** `destinationFor` decides from (auth, emailVerified, profile, segment); `onboardingGate.test.ts` walks every destination it can produce and asserts the gate then leaves the traveler alone there — a redirect loop cannot pass. It also pins the two clauses most likely to rot: a completed traveler is never re-prompted *even with fields since emptied*, and a completed traveler may still open an onboarding route, which is what makes Edit profile work.
4. **A profile that cannot be read must not strand the traveler on a splash.** First cut returned "wait" whenever `/v1/me` had not answered — which, on an error, waited forever. The gate now distinguishes *loading* from *unreadable* and lets the screen report its own error.
5. **Resuming mid-flow requires every step to leave a mark, which makes goals effectively mandatory.** The gate derives the next step from what is empty, so a traveler who answered no goals would be returned to goals forever. `MIN_GOALS = 1` is the consequence, not an independent product rule — the spec mandates a minimum only for interests. Named here because it is a real constraint the spec did not ask for; **cuttable** if the founder would rather the gate tracked a per-step marker.
6. **Handle rules are stated twice, in two languages, and that is a live drift risk.** `Handle` (Java) and `normalizeHandleInput`/`handleFeedbackFor` (TS) encode the same alphabet and bounds; the client also compares `result.handle !== typed`, so a divergence wedges the field on "Checking…" rather than failing loudly. Not resolved here — flagged by the code review, worth a shared contract when the next surface needs it.
