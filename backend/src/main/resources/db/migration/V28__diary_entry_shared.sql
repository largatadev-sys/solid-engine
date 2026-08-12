-- V28 — the shared postcard (S4.22, ADR-025).
--
-- ONE NULLABLE INSTANT, NOT A BOOLEAN. `shared_at` answers both questions the feed asks — *is this
-- public* (NOT NULL) and *when did it become public* (the value) — where a boolean would answer only
-- the first and force a second column the moment the feed needed its order. The feed is ordered by
-- shared-time descending precisely so a retro-shared old entry surfaces at the top (spec decision 5),
-- so the instant is load-bearing, not decoration.
--
-- BORN PRIVATE, AND THE ABSENCE OF A DEFAULT IS THE POINT. No `DEFAULT` clause and no backfill: every
-- existing row lands NULL, which is `private`, which is exactly what ADR-024 promised those entries.
-- A widening migration that flipped shipped diaries public would be the one irreversible mistake
-- available here. Note the S1.1 lesson does not bite: this column holds an instant, not an enum, so
-- there is no Hibernate-vs-SQL spelling contract for a later predicate to get wrong.
--
-- NO TOMBSTONE. Unshare writes NULL back (spec decision 1) — the entry leaves the feed and re-masks
-- to not-found for non-authors. We deliberately do not keep a was-shared trail: nothing reads it, and
-- an unshare is a privacy retraction, so retaining the fact that something *was* public is the
-- opposite of what the act means.
--
-- THE INDEX IS PARTIAL BECAUSE THE FEED ONLY EVER READS SHARED ROWS. It carries the exact ordering
-- the feed query walks — `shared_at DESC, id DESC` — so the cursor page is an index scan rather than
-- a sort over every diary entry ever written. `id` is the tiebreak (UUIDv7, so it is itself
-- time-ordered) and it is what makes the cursor stable when two entries share an instant.

ALTER TABLE diary_entry ADD COLUMN shared_at TIMESTAMPTZ;

CREATE INDEX diary_entry_feed_idx
    ON diary_entry (shared_at DESC, id DESC)
    WHERE shared_at IS NOT NULL;
