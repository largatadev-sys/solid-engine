# 07: Trip destruction, and the FK drops that make survival true

**What to build:** the story's headline act: the owner deletes a trip and the workspace world is destroyed in one transaction — while every content object, the fork records, and the old world's entries all stand. The two constraint drops land first, so nothing destroyed can cascade into anything meant to survive.

**Blocked by:** 02 (Publication), 06 (Trip-derived postcards).

**Status:** done

- [x] The two constraint drops (the old entries table's trip cascade and activity pointer) land with stepping ITs, sabotage-checked; after them, destroying a trip cannot cascade into old-world entries and deleting an activity no longer nulls their pointers
- [x] The owner deletes a trip from any lifecycle state — published or archived alike: one transaction destroys the workspace world (plan, chat, polls and votes, photo dump, memberships, invitations, ownership records, join link and pending requests) and the workspace-world media's stored objects
- [x] After the delete: the trip's minted itinerary object, every member's diaries and postcards (old-world entries included), forked copies and fork provenance all remain — each proven, not assumed
- [x] A member who is not the owner gets the named forbidden; a non-member and a repeat delete answer the masked not-found
- [x] The act logs and emits its analytics event by ids only
- [x] Existing suites pass untouched

## Comments

- *2026-08-30:* "untouched" holds with one disclosed exception owned by this ticket's FK drops: the old world's `DiaryContractIT` pinned the SET NULL that V52 removes, and its one assertion is re-pinned to the ruled dangling behavior — see ticket 09's comment for the full account.
