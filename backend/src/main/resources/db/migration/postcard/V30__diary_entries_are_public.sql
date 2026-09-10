-- V30 — every diary entry is public (S4.22, founder reversal of ADR-025 decision 1).
--
-- V28 introduced `shared_at` as a per-entry opt-in, born NULL, and its header called flipping
-- shipped diaries public "the one irreversible mistake available here". This migration does exactly
-- that, deliberately and on the founder's direction: posting a diary entry now publishes it, there is
-- no per-entry privacy state, and no UI anywhere sets or clears this column. A row left NULL would
-- therefore be permanently invisible in the feed with nothing able to surface it — private in a
-- product that no longer has a private.
--
-- WHY created_at AND NOT now(). The column orders the feed (`shared_at DESC`) and drives the card's
-- time-since. Stamping every legacy row with the migration's clock would file a trip from last month
-- at the top of the feed, all of them tied, and would make the card claim a moment that never
-- happened. `created_at` is when the postcard was written, which is the honest answer to "when did
-- this become public" for an entry that was always going to be public under the new rule.
--
-- THE COST, ACCEPTED KNOWINGLY. This is not reversible by a later migration: once these entries are
-- readable by any signed-in traveler, unpublishing them cannot unsee them. It is tolerable only on
-- the standing ground that the installed base is the founders' own (the same ground ADR-008 has been
-- waived on five times in this story family). Against a real user base this needed consent, not SQL.
--
-- `shared_at` KEEPS ITS NULLABILITY rather than becoming NOT NULL. The column is still structurally
-- optional because the mechanism it belongs to is parked, not deleted: the friend graph, or a later
-- per-entry control, re-enters through this same column, and a NOT NULL would have to be dropped
-- again to allow it. Nothing writes NULL today.

UPDATE diary_entry
SET shared_at = created_at
WHERE shared_at IS NULL;
