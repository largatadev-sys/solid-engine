# 05 — The one day surface (mobile)

**Status:** implemented — closed on the local rig at ticket 06

**What to build:** the consolidation (spec decision 9). The chips editor **is** the day screen — day chips (with "+" rendered owner-only), activity cards, FAB (add activity, every member), kebab per card (edit / delete, delete lease-gated) — entered from create-Continue at Day 1 or a workspace day card at that day. The `collaborative-edit` mock is this screen's decorated state: lock borders + "*Being edited by @handle*" rendered from ticket 01's pull-based payload fields (advisory — **never disables the tap**; a failed acquire shows the modal), and attribution chips ("Updated 2m ago by @handle"). Reorder keeps the arrows (grip stays deferred) and handles the 409 by refetch-and-reapply. The "View Activity History" link ships greyed (`comingSoon` + analytics) until S4.10. The old separate day/edit surfaces fold in or are deleted — client code carries no additivity duty.

**Blocked by:** 01 — the lease read surface, reorder versioning, and per-subject enforcement; 03 — the routing shell it lands in.

- [x] Two pool members edit different activities of one day concurrently from two devices/surfaces; both saves land and both cards show the right attribution (spec AC 1 — client half)
- [x] Entering a held activity shows the modal; the card's lock border and holder handle render from a pull and never disable the tap — a stale-expired lease acquires on tap (spec ACs 2, 8)
- [x] "+" chip renders for the owner only; FAB renders for every member (spec decision 9; the interim ruling)
- [x] Delete on the kebab is lease-gated; a held activity's delete refuses with the holder named (spec AC 3 — client half)
- [x] A stale reorder 409 refetches and re-applies without losing the traveler's intent; fresh reorder persists across refresh (spec AC 7 — client half)
- [x] Attribution chips render "@handle · relative time" from the additive payload fields (spec AC 14)
- [x] The history link greys with `comingSoon` + analytics (spec AC 11)
- [x] One day surface remains in the tree: both doors land on it and no orphaned screen survives (spec decision 9)

## Comments
