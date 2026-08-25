# 03 — The editing-session events reach the Trips card *(the tracer bullet)*

**What to build:** the founder's named example, end to end. t1 is sitting on Trips; t2 taps Edit Itinerary on a shared trip; **t1's "being edited by…" card appears while t1 is looking at it**, with no refresh and no navigation. t2 leaves the editor and the card clears.

**Blocked by:** 02.

**Status:** ready-for-agent

- [x] `EditLeaseService` raises `editing-session.acquired` and `editing-session.released` through the existing `AfterCommit` seam, fanned onto the trip's topic. A rolled-back acquisition broadcasts nothing (the AFTER_COMMIT pair, IT-proven).
- [x] Both carry a **payload**, absorbed straight into the cached trip — **zero queries**. `ItineraryResponse` already carries `beingEdited`, `lease`, `editingSession` and `lastEditedBy*`, so the fields have somewhere to land and **no `/v1` change is needed**; confirmed by reading the record, not assumed.
- [x] The client's **event dispatch table** is built here — type to handler, with **unknown types ignored silently** (ADR-030's tolerance rule). Tickets 04–06 add rows to it; they do not each invent a dispatcher.
- [x] The traveler-topic subscription is held **once, at the root**, beside `useSocketLifecycle` — for the app session, not per screen.
- [x] Absorb functions are pure and Jest-tested — given a cached page and an event, the resulting page. **No component rendering.**
- [x] Playwright, two browser contexts: t1 on Trips, t2 acquires and releases. Asserted **at the socket and at the render**. Sabotage-verified by breaking delivery.

## Comments

**2026-08-25, implementation — closed.** Backend `EditingSessionEventsIT` (4 tests) green; mobile Jest **142 suites / 4,797 tests** green; `live-trips.spec.ts` (3 tests) green three consecutive runs at 21–26s, against a **rebuilt** preview container and a **rebuilt** backend.

**Sabotage-verified twice, each landing proven by grep first.** Deleting the acquire broadcast reddens both backend delivery tests with *"No frame arrived within 5s"*. Forcing the ledger's traveler-topic branch to return early reddens the render walk while the two socket-level tests keep passing — which is the right shape: the frame still arrives, only the delivery to the holder stops.

**The finding that mattered, and it was invisible to both sides in isolation: the client's ledger keys strictly by topic name, so ticket 02's fan-in delivered nothing.** The server resolves memberships once at subscribe and registers the session under `itinerary:{id}:trips`, so frames arrive addressed to a *trip* while the only ledger entry is `traveler:{id}` — `entries.get(topic)` misses, and every frame is dropped **in silence**. Backend ITs pass (the frame is genuinely broadcast and genuinely received by a raw client), the pure Jest absorb tests pass (they call the function directly), and the app shows nothing. Only the browser walk could see it. `SubscriptionLedger.deliver` now also hands a `:trips` frame to any traveler-subject holder, de-duplicated so a session holding both entries is called once; four new ledger tests pin it, including the negative — a `:chat` frame is **not** handed to the traveler subject.

**Three harness defects found, all mine rather than the product's, recorded because each cost a cycle and each reads as a product failure.**

1. **The Trips screen remembers its tab.** The walk landed on *Ongoing* (left there by an earlier spec) while the seeded trip is *Upcoming*, so `getByText(title)` found nothing — reading exactly like a broken list. The spec now selects its tab explicitly.
2. **A page-wide `toHaveCount(0)` answers for other people's trips.** The pool database holds trips from every previous walk, several with live Editing Sessions, so the "no advisory yet" precondition was false before the walk did anything. Every assertion is now scoped to the card this walk seeded, addressed by its unique stamped title.
3. **The trip row renders as `link`, not `button`.** `getByRole('button', { name: title })` matched nothing while the card was on screen and correct. Same family as S4.20's tab-role trap: *when a driver says a control is missing, suspect the harness's vocabulary before the screen.*

**And one real race in the walk, fixed rather than tuned away:** the walk acquired the lease before the client's subscription had landed, so the event reached nobody and the card was judged against a socket that was never listening — one run in two. It now waits for the `traveler:{id}` subscription to be acknowledged before acting, which took the suite from *1 flaky / 2 passed* at 51s to *3 passed* at 21s.

**Diagnosis note for whoever picks up 04–06:** three rounds of inference about why the card did not move produced three wrong answers. What ended it was one throwaway Node script that opened a browser, injected a pool session, printed **every frame sent and received**, and dumped the page text — it showed the subscribe, the frame arriving, and the advisory rendering, all in one output. Instrument the boundary before re-reading the code (S4.30's lesson, paid again).
