# 01 — The four-state lifecycle, end-to-end on the API

**What to build:** a trip can be walked through its whole life over the wire — created `draft`, planning finished (`draft → upcoming`), started (`upcoming → ongoing`), completed (`ongoing → completed`), published — with every illegal move refused by a code naming why. ADR-020's ladder, on the API alone.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] The lifecycle enum carries `draft | upcoming | ongoing | completed`; `active` exists nowhere — wire, data, or code.
- [x] The migration adds the new value and remaps every `active` row to `ongoing`, opening with the guard block that refuses any value it cannot classify (the V18/V20 discipline).
- [x] A migration-stepping IT on its own container (the `ItineraryAxesBackfillIT` pattern) proves the remap against seeded legacy rows and is sabotage-verified — deployed dev is the only database with real rows, so no other surface can catch a wrong remap.
- [x] A new transition endpoint moves `draft → upcoming` (Finish Planning's server half); `/start` re-anchors to `upcoming → ongoing`; `/complete` to `ongoing → completed`.
- [x] One-step undo works down the whole ladder — `completed → ongoing`, `ongoing → upcoming`, `upcoming → draft` — through the existing reopen family; a two-step jump is refused naming why.
- [x] Every transition is refused while `published` (the lifecycle is pinned); every transition is owner-only per the guard, membership resolved as always.
- [x] Publishing is refused from `draft`, `upcoming` and `ongoing` with the precondition named; it succeeds from `completed` and defaults `public` — the S4.11 gate re-proven over four states.
- [x] Plan edits succeed in every unpublished state including `completed`; a published trip refuses plan edits and accepts membership acts — `WriteFence` untouched, re-verified.
- [x] The workspace-state mirror follows the new ladder in both directions (the S4.11 comment-5 lesson: every forward mirror needs its reverse).
- [x] Lifecycle stamps stay write-once and never appear on the published projection (INV-2's absence rule holds).
- [x] Backend unit + IT suites green.
