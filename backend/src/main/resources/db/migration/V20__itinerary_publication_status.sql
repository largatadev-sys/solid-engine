-- V20 — publication status replaces the binary visibility fact (ADR-018, founder-ruled 2026-08-01).
--
-- THE MODEL, restated because the column is meaningless without it. One three-valued, mutually
-- exclusive fact:
--   draft   — the traveler is still working on it. Owner + collaborators. EDITABLE.
--   private — published, but only the owner and collaborators can read it. FROZEN.
--   public  — published to every onboarded traveler (the discovery feed's future stock). FROZEN.
-- `private` and `public` are both *published*; they differ only in audience. Unpublishing returns an
-- itinerary to `draft`, and that is the only way back to editing it.
--
-- WHY A NEW COLUMN RATHER THAN A THIRD VALUE ON `visibility`. Two reasons, both about honesty of
-- naming. `draft` is not a visibility — a draft and a private itinerary are visible to exactly the
-- same people, and differ by whether the plan can be edited. And the word `draft` already means
-- something else on this very row: `state` holds the dormant `draft → active → completed` lifecycle
-- (V12, UI removed at the E1 promotion gate). Two unrelated "draft"s on one object is the ambiguity
-- the domain model exists to prevent, so publication status gets its own name and `state` keeps its
-- own, staying invisible.
--
-- THE BACKFILL IS A WIDENING, NOT A GUESS. Before this migration `visibility` held exactly two
-- values and both map without loss:
--   * 'PUBLISHED' → 'PUBLIC'  — it was readable by every authenticated traveler, which is what
--     public now means. The narrower `private` audience did not exist to be chosen, so no published
--     itinerary can have wanted it.
--   * 'PRIVATE'   → 'DRAFT'   — it meant *not published*, which is what draft now means. It did NOT
--     mean today's `private`; that value is new and nothing can already be in it.
-- Reading that mapping backwards is what makes the DROP below safe: `status` carries every fact
-- `visibility` carried.
--
-- INVISIBLE TO EVERY TEST SURFACE THIS REPO OWNS — the local stack is fresh-DB-every-redeploy,
-- Testcontainers boots empty schemas, CI likewise, so on all of them this UPDATE touches zero rows
-- and reports success whether the mapping is right, backwards, or a typo. `ItineraryStatusBackfillIT`
-- manufactures the pre-V20 shape on its own container and asserts both arms. Same discipline as
-- V5, V13 and the CLAUDE.md rule learned at S1.1 on the first data migration this repo wrote.

ALTER TABLE itinerary ADD COLUMN status TEXT;

UPDATE itinerary
SET status = CASE WHEN visibility = 'PUBLISHED' THEN 'PUBLIC' ELSE 'DRAFT' END;

-- NOT NULL after the backfill and with NO default, which is V13's shape for V13's reason: every
-- INSERT path supplies the value (Hibernate always writes the field), so a default would be dead
-- weight carrying a spelling trap — exactly what V3's `DEFAULT 'private'` became, and what V18 had
-- to remove. The spelling here is the enum NAME, upper-case, because @Enumerated(STRING) writes it:
-- ItineraryStorageIT pins that so a later migration cannot quietly reintroduce a lower-case form.
ALTER TABLE itinerary ALTER COLUMN status SET NOT NULL;

-- The old column goes. This is a RENAME-AND-WIDEN completed above, not a deletion of a fact: every
-- value `visibility` held is now in `status`, provably, by the mapping this migration just applied.
-- Leaving it would be worse than dropping it — it is NOT NULL with no default (V18), so the entity
-- would have to keep writing a field the domain no longer has, and a stale duplicate of a fact is
-- how two sources of truth start. ADR-008's additive-only rule is waived here on the record, the
-- third time in this story, and defensible for the same reason each time: the installed clients are
-- the founders' own.
ALTER TABLE itinerary DROP COLUMN visibility;
