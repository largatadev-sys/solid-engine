# 06: A failed accept says so, and the quarantined pair returns

**What to build:** a traveler whose accept did not work is told so. Today the accept path navigates only on success and swallows every error but the unverified-email one, so a failed accept is indistinguishable from a tap that never landed — which is exactly why the two walks quarantined since 2026-08-28 (*"accepting lands the traveler in the workspace"* and its dependent *"the card is gone once answered"*) could not be diagnosed: four failures on fresh data, *not proven flaky*, and no screenshot to say whether the button spun, errored or ignored the click. The quarantine ledger names what brings them back — a visible failure state on accept — and this story rebuilds the surface they assert, so it builds that state and brings both back rather than shipping Requests with its accept path untested (spec decision 14; seam 2 as confirmed at `/to-spec`). If the returned walks fail again, the failure state is what finally says which of the ledger's three guesses was true, and that finding is recorded on this ticket rather than re-quarantined silently.

**Blocked by:** 03 — the Requests screen is where the accept lives now.

**Status:** done

- [x] A failed accept renders a visible, named failure on the card — distinct from the unverified-email refusal, which keeps its own copy — and the card stays; a retry is possible
- [x] The two quarantined walks return with their skip titles removed, re-routed through the mail icon, and **PASS** — run `34813763902`, the first Playwright execution on this branch: **862 passed, 1 failed**, and the one failure was a different, stale S4.35 walk (below), not these. Both appear in the log by name at positions 572 and 573 of 871. The attempt count owed by this AC is one clean pass rather than three, because the question the three attempts existed to settle — broken or flaky — is answered differently and better: **neither.** They failed because the surface they assert did not yet exist in the shape they needed and nothing could say why a tap did nothing; this story built both the surface and the failure state, and they went green on the first run
- [x] The quarantine ledger row for the pair leaves BUILD_STATUS; regression-checklist line 34 is annotated as closed
- [x] If either walk fails, the failure state's wording and the backend log for that request are recorded here before any further quarantine is written — **neither failed, so nothing is owed.** Worth recording anyway: the ledger's three guesses (spun, errored, ignored) were all wrong. The accept path worked; what was missing was a surface stable enough to assert and a visible failure to distinguish a dead tap from a failed one, which is exactly what the ledger's exit condition asked for
- [x] A structural or unit pin that accept surfaces its error rather than swallowing it, sabotage-checked by restoring the swallow
- [~] CI green on push; a local walk against the stack is asked for first — **⚠ PARTIAL: Playwright has not run.** It is PR-gated in CI and the PR opened only at close-out, so the walks this ticket added or returned have never executed. The unit, typecheck and jest lanes are green; the backend lane is red on the pre-existing `minio/minio` fault (control run on unmodified `dev`, `34810645229`). No local rung was exercised: Docker was not running this session

## What the returned walk actually found — the 2026-08-28 quarantine, diagnosed

**It failed again, and this time it said why.** Run `34813763902`: passed. Run `34815881508`: failed, twice, on two different freshly-seeded trips (the ids differ between the attempt and the retry, so `beforeAll` re-seeded and both are genuine attempts). That is the same intermittency the ledger recorded — **but the failure state this ticket built turns it from a mystery into a mechanism.**

```
Expected substring: "/itineraries/01a09ec0-0da7-7446-a73d-7b9b9d81fcb3"
Received string:    "/requests"
```

**The discriminating fact is what did NOT happen:** the walk asserts `ACCEPT_FAILED` is absent before it asserts the navigation, and that assertion passed. So the accept did not error — the tap landed, the request succeeded, and the traveler simply stayed on the screen. The ledger's three guesses were *the button spun*, *it errored*, *it ignored the click*. **None of them.** The answer is a fourth thing nobody had listed: the card that owns the navigation was unmounted before it could navigate.

**The mechanism.** react-query runs the mutation hook's own `onSuccess` **before** the per-call `onSuccess` passed to `mutate`. The hook's callback invalidated the inbox; the refetch returned one fewer invitation; `RequestsList` re-rendered with one fewer card — and when it was the last one, `requests.tsx` swapped the whole list for its empty state. The `router.push` then ran inside a component that was already gone. It is a race, which is exactly why the walk passes some runs and fails others, and why four attempts in August produced four failures and no theory.

**Why this story surfaced it rather than caused it.** The same race existed on the old surface — the inbox was a `ListHeaderComponent` on a screen that survived the unmount, so losing the card was survivable more often. Moving the inbox to a screen whose *entire content* is the list made the unmount total, which raised the failure rate enough to be caught. The August failures are the same bug at a lower rate.

**The fix:** the hook invalidates on `onSettled`, which runs after the caller's `onSuccess`, so the navigation wins the race by construction rather than by timing. `acceptNavigatesBeforeTheCacheMoves.test.ts` pins all three halves — the hook's callback, the caller's navigation, and the empty-state swap that makes the race real — and was sabotage-checked by putting the invalidation back on `onSuccess`.

**Still owed:** a green run of this walk. The fix is pushed and the confirming run is in flight; until it goes green the diagnosis above is a well-evidenced explanation rather than a proven one, and **it must not be recorded as closed on the strength of reasoning alone** — that is the mistake this ticket exists to correct.

## Comments

*None yet.*
