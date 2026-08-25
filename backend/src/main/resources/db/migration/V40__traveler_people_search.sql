-- V40 — the index People search runs on (S4.36 ticket 04).
--
-- Additive, index-only: no column is added, no row is rewritten, so there is nothing for a
-- stepping-IT to catch (the V15 reasoning applies unchanged — the V5 lesson binds where rows must
-- be REWRITTEN, and here none are).
--
-- What the search is, and therefore what the index must serve (spec decision 7, refined by the
-- canvas's C5): a case-insensitive PREFIX match on the display name or the handle, over onboarded
-- travelers only. Never a substring, never a fuzzy match, and never the email column — an
-- email-shaped query must match nothing even when it equals a traveler's stored email, which is
-- enforced by the query naming only these two columns and is asserted server-side.
--
-- The handle half already has its index: V15's traveler_handle_idx is on lower(handle), and a
-- btree on a lower() expression serves `lower(handle) LIKE 'ma%'` as a range scan. Only the
-- display-name half is missing, so only it is added here.
--
-- text_pattern_ops is the load-bearing detail, not decoration. A default btree on lower(display_name)
-- orders by the database's collation, and under any non-C collation a LIKE 'prefix%' cannot be
-- turned into a range scan — Postgres would plan a sequential scan while the index sat there looking
-- like it was doing its job. That is the indistinguishable-outcomes shape: the query returns the
-- right rows either way, and only the plan tells you the index is dead. text_pattern_ops orders by
-- raw byte value, which is exactly what a prefix comparison needs.
--
-- Partial on onboarding_completed_at because an un-onboarded traveler is unreachable by definition
-- (spec decision 3): they have no profile and never appear in search, so their rows do not belong in
-- the index the search reads.
CREATE INDEX traveler_display_name_prefix_idx
    ON traveler (lower(display_name) text_pattern_ops)
    WHERE onboarding_completed_at IS NOT NULL;
