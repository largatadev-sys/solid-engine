# 02 — The other three tabs, the two hand-rolled copies, and Home's poll

**What to build:** every tab is correct when you return to it, and a screen nobody is looking at stops making requests. Home, Discover and Profile join Trips on the shared helper; the two surfaces that already hand-rolled this pattern move onto it rather than remaining twins of it; and Home's 60-second feed poll starts on focus and stops on blur.

**Blocked by:** 01.

**Status:** needs-triage

- [ ] Home, Discover and Profile list queries revalidate on focus through the ticket-01 helper — one line each, no second copy of the logic.
- [ ] `pollQueries` (S2.1) and `WorkspaceTravelersTab` (S4.28) migrate onto the shared helper. **Behaviour is unchanged on both** — the poll surface and the roster still refetch exactly when they did. Two existing copies of a pattern about to gain four more is how the counter-pill chrome ended up in three files.
- [ ] Home's feed `setInterval` starts on focus and is cleared on blur. `POLL_MS`, `freshPosts.ts` and `NewPostsPill` are **untouched** — the pill is the best freshness affordance in the app and this ticket does not redesign it.
- [ ] **The discriminating check, and it states its own failure:** park on Home and observe the feed request in the backend log; move to another tab and observe **no further feed requests**; return to Home and observe them resume. The absence is the assertion, so the presence must be established first — a check whose two outcomes are indistinguishable proves nothing.
- [ ] The pill still appears when another traveler posts while Home is focused, and tapping it still refreshes to top.
- [ ] No regression on the poll surface or the Travelers tab roster after migration.
