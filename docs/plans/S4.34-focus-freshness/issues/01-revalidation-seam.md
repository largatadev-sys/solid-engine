# 01 — The revalidation seam, proved on Trips

**What to build:** a traveler edits a trip in the Itinerary Workspace, navigates to Home, comes back to Trips — and the card is correct, with no pull-to-refresh, no spinner, and no lost scroll position. Both halves of the mechanism ship here with **exactly one call site**, so the pattern is proven before it is replicated across four screens.

**Blocked by:** None — can start immediately.

**Status:** needs-triage

- [ ] `AppState` drives react-query's `focusManager` (app-level): background → foreground marks the client focused and revalidates what is on screen. Lives beside `useSocketLifecycle` in the root layout — the same lifecycle question asked of a second subsystem. The web fork keeps react-query's own window-focus default; only native supplies `AppState`.
- [ ] One shared helper — `useRevalidateOnFocus` — wrapping `useFocusEffect` + `refetch`, applied to the Trips list query **and nowhere else in this ticket**.
- [ ] It **background-revalidates**: the cached data stays rendered, no `isPending` state is entered, nothing flashes and the list does not jump. Assert the absence of a loading state, not just the presence of fresh data — "it refetched" and "it refetched without a spinner" are different claims and only one of them is the AC.
- [ ] `staleTime` is **not** changed. 30 seconds stays the bounded-staleness window; what was missing is a trigger, not a shorter fuse.
- [ ] The revalidation predicate is a pure, Jest-tested module with a sabotage-verified failure mode (a helper that refetches while already pending must turn a test red).
- [ ] Playwright (web project): mutate a trip through a second browser context, navigate away and back in the first, assert the card without any refresh gesture. Sabotage-verified by removing the focus wiring.
- [ ] No socket, no backend change, no wire change, no new dependency.
