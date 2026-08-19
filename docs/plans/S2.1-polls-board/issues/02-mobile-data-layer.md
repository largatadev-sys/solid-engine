# 02 — Mobile data layer: types, repository, queries, and the pure board module

**What to build:** the typed path from wire to screen — api types, repository methods through the typed `apiClient` (ADR-001: no raw fetch in UI), react-query hooks, and the pure board-anatomy module every screen state renders from.

**Blocked by:** 01 (the wire shape it types).

**Status:** needs-triage

- [ ] `types/api.ts` additions: `PollResponse` (options with voter roster entries, counts, viewer's vote, computed `status: 'open' | 'closed'`, winner ids, denominator, closes-at, closed-at), request shapes for create/vote.
- [ ] Repository: `polls(itineraryId)` · `createPoll` · `vote` · `closePoll` · `deletePoll` — one-line path templates, the existing idiom.
- [ ] Queries: board query keyed by itinerary, refetch-on-focus (pull-based ruling); mutations invalidate the board key; vote mutation optimistic on the viewer's own vote only (counts settle on refetch).
- [ ] Pure module `polls/pollBoard.ts` (the `landingSlot.ts` precedent — extract the math so Jest never touches reanimated/RN): section split + ordering (active newest-first, completed recently-closed-first) · winner/tie/zero star sets · progress ("N of M voted", percentage) · deadline meta copy ("Poll closes in 3 hours · Oct 24, 6:00 PM", "Poll closed · … · Tie" / "· No votes") · vote-state grammar resolution (none / selected / recorded / changing, per canvas frame 3) · kebab visibility (creator or owner) and its menu contents (open: close+delete · closed: delete only) · create-form validity (question + 2 non-empty options; trash hidden at 2; Add Option hidden at 10).
- [ ] Jest: pollBoard cases for every branch above — ties, zero votes, denominator shifts, the `?? undefined` cursor rule does not apply (no pagination on the board read) but the deadline instant parsing does: UTC instant in, device-local render out.
- [ ] Repository/query tests per the existing families (error translation, invalidation).
