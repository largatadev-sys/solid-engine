# 03 — My Trips becomes membership-scoped

**What to build:** the S1.5 discovery fixed. A traveler's home list shows every trip they are a member of — joined trips finally appear for members, and a transferred trip stays on the ex-owner's list. One merged list, same ordering, nothing new on the wire: old clients simply receive the rows the client's own cache-invalidation comments always believed in.

1. **The query, ADR-002-clean:** the itinerary module never touches membership tables. The workspace side exposes the caller's itinerary-id set by service interface; the itinerary side pages over it with the existing keyset shape. Since S1.1 every owner has a membership row, so one membership-scoped path covers owned and joined uniformly — no union, no special case.
2. **Migration (additive):** the membership-side index for the traveler-id lookup — the membership PK leads on workspace id, so a by-traveler read has nothing to stand on without it (the epic-map line flagged exactly this).
3. **Wire:** no change to the list item shape. The endpoint's semantics move from "trips you own" to "trips you're in" — the correction toward what S1.2's client already asserted; record the ADR-008 reasoning in the PR (more rows, same shape, no field renamed or retyped).
4. **Client:** nothing. `onInvitationAccepted` / `onMembershipEnded` already invalidate the list — S1.5's note kept them for "the day the list becomes membership-scoped," which is this ticket. Their comments and tests stop saying the drop "cannot happen."
5. **Tests:** a member sees a joined trip in the list (the S1.2-era assertion that was structurally impossible now passes) · keyset pagination pages correctly across the join, cursor semantics untouched · the ex-owner still sees the trip after a transfer (needs ticket 02 — the reason for this ticket's blocking edge) · an ex-member's list drops the trip (S1.5's eviction, now finally visible in the list surface).

**Blocked by:** 02 — Accept executes the transfer *(only the post-transfer IT needs it; recorded at ticket-cutting as the deliberate price of keeping spec AC 8 whole in one ticket)*.

**Status:** done

- [x] A member sees a joined trip in My Trips; an ex-member's list drops it (spec AC 8)
- [x] Keyset pagination correct across the membership scope — page boundaries, cursor stability, ordering unchanged (spec AC 8)
- [x] The ex-owner still sees the trip post-transfer (spec AC 8)
- [x] List wire shape unchanged — no new fields, ADR-008 reasoning recorded in the PR

## Comments

**2026-07-28 — implemented.**

1. **The empty-list short-circuit broke cursor validation, and the full suite caught it.** `listMine` returns early when the caller is on no trips (`IN ()` is not valid SQL) — but the first draft placed that check *before* `Cursor.decode`, so a malformed cursor answered **400 for a traveler with trips and 200 for a traveler without**. One bad input, two answers, decided by the caller's data rather than the input: the "check whose outcomes are indistinguishable for the wrong reason" family CLAUDE.md tracks. Found by `ItineraryListIT.aCursorThisApiDidNotIssueIsABadRequestNotAServerError`, which happens to use a fresh traveler. Decoding now happens first, and `MyTripsMembershipScopeIT` pins both callers against the same bad cursor so the ordering cannot regress silently.

2. **V4 predicted this index and deferred it to whichever story wrote the query** ("a traveler-leading index would serve the *other* direction … it lands with the story that writes that query"). V11 is that index, and the migration says so — the deferral was honoured rather than forgotten, which is the outcome the V4 comment was written to produce.
