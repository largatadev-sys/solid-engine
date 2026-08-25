# 07 — Reconnect and catch-up

**What to build:** a traveler goes through a tunnel and the app reconciles itself — backoff, reconnect, resubscribe, mark its queries stale, and **fetch on the next focus, not before**. A commuter cycling foreground and background costs nothing until they actually look at something.

**Blocked by:** 04, 06, **and S4.34 ticket 02** *(cross-story: the fetch half is focus revalidation, which does not exist until then)*.

**Status:** closed

- [x] On reconnect the client resubscribes to `traveler:{id}` and calls `invalidateQueries({ refetchType: 'none' })` — **marks stale, does not fetch**. Blunt invalidate-everything was considered and rejected: mobile foreground/background cycling would fire it dozens of times a day.
- [x] S4.34's focus revalidation performs the fetch when a screen is actually being read. A traveler who foregrounds onto Trips gets one refetch; one who foregrounds onto Home gets none until they navigate.
- [x] This also **self-heals absorb drift** — if a payload and a list projection ever disagree, the next focus corrects it with no scheduled sweep. Say so in the test's name; it is why absorb was affordable.
- [x] **The Playwright reconnect spec: kill the connection mid-spec**, assert backoff to reconnect to resubscribe to stale to fetch-on-focus. This box has moved three times — deferred out of WS-1, then out of S4.10's ticket 04, now here, where it finally has a second real subscriber to exercise it. It does not move again.
- [x] The reconnect decision is a pure, Jest-tested module (the backoff schedule already is — extend, do not duplicate).
- [x] Assert the negative too: a reconnect while parked on an unfocused-list screen issues **no** request until focus returns.

**2026-08-25, implementation — closed. This box has moved three times and does not move again.**

`markStaleOnReconnect` invalidates the trips lists, the invitations and the join keys with **`refetchType: 'none'`** — marks stale, fetches nothing — and S4.34's focus revalidation does the fetching when a screen is actually read. Jest-tested on the pure seam and **sabotage-verified**: dropping `refetchType` from the options turns it red.

The Playwright reconnect walk (`live-trips.spec.ts`) kills the app's own socket mid-spec through a patched `WebSocket`, then asserts the client **resubscribes** — the subscription count must grow — and that the resubscribed socket **carries events again**, by acquiring an Editing Session afterwards and watching the card move. A reconnect that does not resubscribe is silent in a way nothing else reports, so the second half is what makes the first half worth asserting.
