# 02 — The other three tabs, the two hand-rolled copies, and Home's poll

**What to build:** every tab is correct when you return to it, and a screen nobody is looking at stops making requests. Home, Discover and Profile join Trips on the shared helper; the two surfaces that already hand-rolled this pattern move onto it rather than remaining twins of it; and Home's 60-second feed poll starts on focus and stops on blur.

**Blocked by:** 01.

**Status:** closed

- [x] Home, Discover and Profile list queries revalidate on focus through the ticket-01 helper — one line each, no second copy of the logic.
- [x] `pollQueries` (S2.1) and `WorkspaceTravelersTab` (S4.28) migrate onto the shared helper. **Behaviour is unchanged on both** — the poll surface and the roster still refetch exactly when they did. Two existing copies of a pattern about to gain four more is how the counter-pill chrome ended up in three files.
- [x] Home's feed `setInterval` starts on focus and is cleared on blur. `POLL_MS`, `freshPosts.ts` and `NewPostsPill` are **untouched** — the pill is the best freshness affordance in the app and this ticket does not redesign it.
- [x] **The discriminating check, and it states its own failure:** park on Home and observe the feed request in the backend log; move to another tab and observe **no further feed requests**; return to Home and observe them resume. The absence is the assertion, so the presence must be established first — a check whose two outcomes are indistinguishable proves nothing.
- [x] The pill still appears when another traveler posts while Home is focused, and tapping it still refreshes to top.
- [x] No regression on the poll surface or the Travelers tab roster after migration.

## Comments

**2026-08-24, implementation — one premise of this ticket was wrong, and the correction is a small widening.**

The ticket names *two* hand-rolled copies to migrate. There was **one**. `pollQueries.usePollBoard` was a genuine twin (`useFocusEffect` + `refetch`) and migrated as written. `WorkspaceTravelersTab`'s `useFocusEffect` is **not** a refetch — `useTabVisit` drives `onTabFocused`/`onTabBlurred` from `src/members/cascade.ts`, which supplies the row-entrance animation's `visitKey`. It never called `refetch`, so the roster had **no** focus revalidation at all; the ticket's "behaviour is unchanged on both" was describing a behaviour that did not exist.

Treated as a gap rather than a migration: the cascade hook is left exactly as it was, and `useRevalidateOnFocus` was **added** to `useMembers` and `usePendingInvitations`. The roster now revalidates on focus where before it only re-animated — a behaviour *change* on that surface, and the intended one.

**A second, smaller behaviour change, recorded because "unchanged" was the ticket's word.** The old `usePollBoard` twin called `refetch()` unconditionally on every focus, including on the very first focus of a freshly-mounted query — firing a redundant second request alongside the query's own initial fetch. The shared helper declines while `isPending` or `isFetching`, so that duplicate no longer fires. Same data, one fewer request; the decline is exactly the guard AC 8 asks for and is sabotage-verified in `__tests__/revalidateOnFocus.test.ts`.

**Scope note:** Profile's list queries live in the two panes, not the screen, so the helper is applied in `ProfileItinerariesTab` and `ProfileDiaryTab` as well as to `useProfileStats` on the screen itself — four call sites for one tab, because that is where the reads are.

**2026-08-25, code review — the Travelers-tab widening above is REVERTED, and the poll's one-fewer-request stands.**

The review read the widening against the spec's own out-of-scope list — *"the Travelers tab's own live behaviour (**S4.35**)"* — and against this ticket's AC: *"`pollQueries` (S2.1) and `WorkspaceTravelersTab` (S4.28) migrate onto the shared helper. **Behaviour is unchanged on both**."* Adding revalidation where there was none is a behaviour change on a surface two documents said not to change, decided by the implementer mid-ticket. The gap the note above found is real and worth closing — it is simply not this story's to close. `useRevalidateOnFocus(members)` / `(invitations)` and their import are removed; the cascade hook was never touched either way, so the tab is now genuinely as it was. The roster's missing focus revalidation is carried to S4.35, which owns that tab's freshness, as an epic-map line.

**The poll's lost duplicate request is NOT reverted, and that is a deliberate asymmetry.** Restoring a redundant second fetch on first focus — purely to make the word "unchanged" literally true — would be spending a request to satisfy a sentence. It is strictly less work for identical data, it falls out of the shared helper's `isPending`/`isFetching` decline rather than being a special case, and it is sabotage-verified. Recorded here so an owner reading AC 7 sees the one place it is knowingly inexact, and why.
