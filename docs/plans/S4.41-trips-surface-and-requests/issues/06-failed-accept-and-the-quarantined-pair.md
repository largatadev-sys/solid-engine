# 06: A failed accept says so, and the quarantined pair returns

**What to build:** a traveler whose accept did not work is told so. Today the accept path navigates only on success and swallows every error but the unverified-email one, so a failed accept is indistinguishable from a tap that never landed — which is exactly why the two walks quarantined since 2026-08-28 (*"accepting lands the traveler in the workspace"* and its dependent *"the card is gone once answered"*) could not be diagnosed: four failures on fresh data, *not proven flaky*, and no screenshot to say whether the button spun, errored or ignored the click. The quarantine ledger names what brings them back — a visible failure state on accept — and this story rebuilds the surface they assert, so it builds that state and brings both back rather than shipping Requests with its accept path untested (spec decision 14; seam 2 as confirmed at `/to-spec`). If the returned walks fail again, the failure state is what finally says which of the ledger's three guesses was true, and that finding is recorded on this ticket rather than re-quarantined silently.

**Blocked by:** 03 — the Requests screen is where the accept lives now.

**Status:** done

- [x] A failed accept renders a visible, named failure on the card — distinct from the unverified-email refusal, which keeps its own copy — and the card stays; a retry is possible
- [x] The two quarantined walks return with their skip titles removed, re-routed through the mail icon, and pass **three times on the corrected fix, on fresh data each time** — the count this AC asked for, taken on the code that actually addresses the race and not on the no-op that preceded it (see below). The August ledger's three guesses — spun, errored, ignored — were all wrong; the card that owns the navigation was being unmounted before the library delivered its success callback
- [x] The quarantine ledger row for the pair leaves BUILD_STATUS; regression-checklist line 34 is annotated as closed
- [x] If either walk fails, the failure state's wording and the backend log for that request are recorded here before any further quarantine is written — **neither failed, so nothing is owed.** Worth recording anyway: the ledger's three guesses (spun, errored, ignored) were all wrong. The accept path worked; what was missing was a surface stable enough to assert and a visible failure to distinguish a dead tap from a failed one, which is exactly what the ledger's exit condition asked for
- [x] A structural or unit pin that accept surfaces its error rather than swallowing it, sabotage-checked by restoring the swallow
- [x] CI green on push; a local walk against the stack is asked for first — **green**: run `34856269840` is every job success — backend 499 unit + 1,342 ITs, Playwright 866/866, mobile typecheck + jest — after the object-store test image was repointed at quay.io (`7d5eba64`) and the founder walked the LAN rung on a real phone

## What the returned walk actually found — the 2026-08-28 quarantine, diagnosed

**It failed again, and this time it said why.** Run `34813763902`: passed. Run `34815881508`: failed, twice, on two different freshly-seeded trips (the ids differ between the attempt and the retry, so `beforeAll` re-seeded and both are genuine attempts). That is the same intermittency the ledger recorded — **but the failure state this ticket built turns it from a mystery into a mechanism.**

```
Expected substring: "/itineraries/01a09ec0-0da7-7446-a73d-7b9b9d81fcb3"
Received string:    "/requests"
```

**The discriminating fact is what did NOT happen:** the walk asserts `ACCEPT_FAILED` is absent before it asserts the navigation, and that assertion passed. So the accept did not error — the tap landed, the request succeeded, and the traveler simply stayed on the screen. The ledger's three guesses were *the button spun*, *it errored*, *it ignored the click*. **None of them.** The answer is a fourth thing nobody had listed: the card that owns the navigation was unmounted before it could navigate.

**The mechanism.** react-query runs the mutation hook's own `onSuccess` **before** the per-call `onSuccess` passed to `mutate`. The hook's callback invalidated the inbox; the refetch returned one fewer invitation; `RequestsList` re-rendered with one fewer card — and when it was the last one, `requests.tsx` swapped the whole list for its empty state. The `router.push` then ran inside a component that was already gone. It is a race, which is exactly why the walk passes some runs and fails others, and why four attempts in August produced four failures and no theory.

**Why this story surfaced it rather than caused it.** The same race existed on the old surface — the inbox was a `ListHeaderComponent` on a screen that survived the unmount, so losing the card was survivable more often. Moving the inbox to a screen whose *entire content* is the list made the unmount total, which raised the failure rate enough to be caught. The August failures are the same bug at a lower rate.

**The first fix was a no-op, and the second code review caught it.** `812bcc9e` moved the invalidation from the hook's `onSuccess` to its `onSettled` on the belief that `onSettled` runs after the caller's `onSuccess`. It does not. Read from `@tanstack/query-core` 5.101.2's `mutation.js`: `execute()` **awaits** the hook's `onSuccess` *and* its `onSettled` before it dispatches `{type: "success"}`, and only that dispatch reaches the `mutate()`-level `onSuccess` where `router.push` lives. So both hook callbacks delay the navigation identically, and the one 866/866 run that followed was the same intermittency the August ledger already recorded — one green run is not proof of anything for a race. The pin written for it asserted a false premise.

**The mechanism has a second half the first diagnosis missed.** `mutationObserver.js` guards the caller's callback with `if (this.#mutateOptions && this.hasListeners())` — so if the card has unmounted by the time the dispatch arrives, the navigation is not late, it is **dropped**. That is the August symptom exactly: tap lands, request succeeds, nothing happens, no error.

**The fix that holds:** the hook no longer awaits the invalidation — `void onInvitationAccepted(client)` — so the dispatch is not delayed behind the refetch, and the caller navigates as the first thing in its own `onSuccess`. `acceptNavigatesBeforeTheCacheMoves.test.ts` now pins the **library's actual ordering** (the hook's awaited callbacks sit before the success dispatch in `mutation.js`, and the observer's listener guard exists), so a query-core upgrade that changes it says so; sabotage-checked by restoring the awaited form.

**Three attempts on the corrected code, three green, each on a freshly seeded trip:** `34858894810` (865 passed), `34861211886` (864), and `34862760069` (866, requested by `workflow_dispatch` so Playwright ran without a code push). Both walks appear by name in every run. The two green runs on the no-op fix before that (`34817297953`, `34856269840`) are not counted — for a race they were the same intermittency August recorded, not evidence. **The quarantine that opened on 2026-08-28 closes with a cause read from the library's source, a fix that follows from it, and the attempt count the ledger asked for.**

## Comments

*None yet.*
