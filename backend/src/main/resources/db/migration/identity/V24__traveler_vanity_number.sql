-- V24 — the Traveler vanity number: a cohort badge, and the pool it is drawn from (S4.14 ticket 01).
--
-- The number is DECORATION, not identity. The traveler's UUID remains the identifier everywhere —
-- routes, FKs, logs — exactly as ADR-015 says of the handle. Nothing in the system looks a traveler
-- up by vanity number, accepts one as input, or navigates by one; the spec makes that a standing
-- decision rather than a deferral, so a future story adding a lookup is reopening a decision, not
-- filling a gap.
--
-- Both columns are NULLABLE, V15-style: every traveler row that already exists stays legal without
-- being touched, which is what makes this migration purely additive in the sense that matters. V25
-- backfills them; between the two migrations a row with NULLs renders no number and nothing breaks.

ALTER TABLE traveler
    -- The cohort month. 0 is FOUNDERS ONLY and unreachable by the scheme (allocation starts at 1),
    -- so founder exclusivity needs no constraint — it is a consequence of the arithmetic, not a rule
    -- anyone enforces. 1 = the entire beta period, however many calendar months it lasts; 2 = the
    -- launch month; +1 per calendar month after that, from a launch-date config set once at launch.
    ADD COLUMN vanity_cohort      SMALLINT,

    -- The draw from that cohort's pool. RANDOM, never sequential: a sequential number would let any
    -- traveler read off how many people signed up that month (the German tank problem), which is
    -- competitively sensitive for a pre-launch product. The randomness is the whole reason a pool
    -- exists — allocation contention alone would have been answered by a sequence.
    ADD COLUMN vanity_pool_number INTEGER;

-- Uniqueness where the scheme applies, and nowhere else. PARTIAL on vanity_cohort > 0 because every
-- founder holds the same (0, 0) by design — a plain UNIQUE would refuse the second founder.
--
-- Written as a predicate that can actually be tripped, per the V15 lesson: insert (1, 42) twice by
-- raw SQL and it must refuse; insert (0, 0) twice and it must allow. TravelerVanityStorageIT does
-- precisely that, and both halves were confirmed to fail when the index was sabotaged (dropping the
-- predicate breaks the founder case; dropping the index breaks the scheme case). An index whose two
-- outcomes are indistinguishable is the class of non-check this repo has been burned by three times.
CREATE UNIQUE INDEX traveler_vanity_idx
    ON traveler (vanity_cohort, vanity_pool_number)
    WHERE vanity_cohort > 0;

-- The pool: one row per number per cohort, claimed at most once, FOREVER.
--
-- Rows are MARKED claimed rather than deleted, and the difference is a correctness bug, not a style
-- choice. "Does this cohort's pool exist yet?" is answered by the presence of rows; if claiming
-- deleted them, a fully-drained cohort would look exactly like a cohort that had never been
-- generated, and the lazy generator would refill it with numbers already held by travelers. The
-- partial index above would then convert that into failed sign-ups. Marking makes never-recycled
-- structural: a claimed row is a permanent tombstone, and the number cannot come back even after
-- the traveler holding it is anonymized (S5.5 keeps the number on the husk deliberately).
CREATE TABLE vanity_pool (
    cohort       SMALLINT    NOT NULL,
    pool_number  INTEGER     NOT NULL,

    -- The shuffle, materialized. Rows are INSERTED in numeric order (so two concurrent generators
    -- lock rows in the same sequence and cannot deadlock) but DRAWN in draw_order, which is the
    -- shuffled permutation. Randomness therefore lives in one column written once, rather than in an
    -- ORDER BY random() that would re-scan the whole cohort on every sign-up.
    draw_order   INTEGER     NOT NULL,

    claimed_at   TIMESTAMPTZ,

    PRIMARY KEY (cohort, pool_number)
);

-- The claim query's index: "the next unclaimed number in this cohort" is the only read this table
-- ever serves. PARTIAL on unclaimed rows, so it shrinks as a cohort drains rather than growing
-- forever with tombstones.
CREATE INDEX vanity_pool_next_idx
    ON vanity_pool (cohort, draw_order)
    WHERE claimed_at IS NULL;
