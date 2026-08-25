# 06 — The Travelers tab, and the audience rule proved

**What to build:** the roster reflects joins and departures while the tab is open, and a new join request arrives in the owner's queue as it is made — **while a non-owner member on the same tab receives the frame and issues no request at all.** This is the contentless-signal design's proving case.

**Blocked by:** 03.

**Status:** closed

- [x] `roster.changed` is a **signal**; the client refetches members. Membership grant and removal both raise it.
- [x] `join-requests.changed` is a **signal that carries no payload whatsoever**. The queue is owner-only (`useJoinRequests` is enabled for the owner alone), so a payload on a trip-wide frame would tell ordinary members what REST withholds. **An IT asserts the frame's payload is empty** — this is the rule ADR-030's amendment adds, and a test that only checks delivery would pass while the rule is broken.
- [x] **The non-owner assertion, and it must state its own failure:** with an owner and a non-owner member both on the tab, a new join request produces **one** refetch — the owner's. Establish the owner's request first, then assert the absence of the member's; an absence with no established presence proves nothing.
- [x] No owner-scoped channel and no per-subscriber filtering at fan-out. Ownership transfer must not require moving any registration — if the implementation drifts toward one, the audience rule has been abandoned and the ADR amendment is wrong.
- [x] Playwright, three contexts (owner, member, requester) for the queue walk; two for the roster walk.

## Comments

**2026-08-25, reconciliation with S4.34's close (pre-implementation) — two facts this ticket's implementer needs, both dated after its approval.**

**The tab this ticket lights up has no focus revalidation, and this ticket owns adding it.** S4.34 wired `useRevalidateOnFocus` into `WorkspaceTravelersTab` mid-ticket and its review reverted it — correctly, by that spec's own out-of-scope list, which reads *"the Travelers tab's own live behaviour (S4.35)"*. The gap is an epic-map line (2026-08-25) whose trigger names this story: *decide focus and socket freshness for that tab together*. Decided here, the obvious way: the roster and invitation queries go onto the shared helper (`useRevalidateOnFocus(members)` / `(invitations)` — two lines) beside the socket events this ticket adds. Without it, ticket 07's reconnect contract has a hole on exactly this tab: reconnect marks queries stale and relies on focus to fetch, and a tab that never refetches on focus never reconciles after a tunnel until remount. Discharge the epic-map line when this lands.

**Write the non-owner absence assertion on the instrument S4.34 had to build, not on a settle.** Every one of S4.34's "no new request appeared" flakes was a fixed or request-quiet settle racing an in-flight mount fetch — neither sees responses. `trackApiTraffic` (`e2e/web/focus-freshness.spec.ts`) counts in-flight requests and settles on zero-in-flight plus a stable total; the checklist's owner-first-then-absence shape stands, this is only the how. Same lesson for finding rows: `GET /v1/itineraries` orders newest-first (UUIDv7 id, descending), so a freshly seeded trip sits at the **top** — assert visibility where it is, never scroll-hunt for it (S4.34's destructive row search re-paginated a ~300-row list for 45 seconds and starved the sibling worker).

**2026-08-25, implementation — closed.** `join-requests.changed` and `roster.changed` ship as **contentless signals**; `live-travelers.spec.ts` (2 tests) proves both, three browser contexts for the queue walk.

**The audience rule is proven by a check with a real failure mode, which is the whole point of this ticket.** The non-owner assertion establishes the owner's refetch *first*, then asserts the member's absence — and it was **sabotage-verified**: making `refetchJoinRequests` also refetch a query the member holds turns it red. Without that run the assertion would have been indistinguishable from a member who simply never received the frame.

**Written on `trackApiTraffic` from the start** (the reconciliation note's instruction), counting in-flight requests and settling on zero-in-flight plus a stable total — not a fixed sleep, which is what flaked through all of S4.34.

**The Travelers tab gained focus revalidation here**, discharging the epic-map line whose trigger named this story: `useRevalidateOnFocus(members)` / `(invitations)` beside the socket work, so reconnect-marks-stale has something to fetch on this tab. `focusFreshness.test.ts`'s structural guard now covers it.
