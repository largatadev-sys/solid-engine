-- V33 — the trip's own two facts: ONE destination, ONE currency (S4.25 ticket 01, ADR-028).
--
-- This is the migration the ADR-008 waiver exists for. It does something no other migration in this
-- tree has done: it DROPS a shipped column and narrows a shipped wire shape. The waiver is on the
-- record in the S4.25 spec, and the standing ground is that every installed client is a founder's
-- own — there is no third-party app to break, and no traveler outside the founding group.
--
-- ---------------------------------------------------------------------------------------------
-- V3's comment on `destinations` NOW LIES, and it is not editable — read this instead.
--
-- V3 wrote: "Plural because Artifact 02 says 'destination(s)' and a singular column is the wart that
-- additive-only evolution (ADR-008) could never remove — only add a second field beside." That
-- reasoning was sound and its conclusion is now reversed by ruling rather than by argument: the
-- founder ruled ONE destination per trip (2026-08-09, re-affirmed at S4.25's grilling), so the wart
-- is the plural, and a waiver is exactly the instrument that removes it instead of adding beside it.
--
-- V3 is NOT amended, deliberately: Flyway checksums migration content, so editing an applied
-- migration is green locally and fatal on every rung that has already run it — the E1 promotion gate
-- rejected exactly this edit on V13. The correction lives here, in the migration that ships the
-- reversal, which is the only place it can live and stay true.
-- ---------------------------------------------------------------------------------------------

-- The trip's currency. Nullable in the column even though the domain treats it as always-present:
-- the backfill below fills every existing row and the application supplies it on every INSERT, so a
-- NOT NULL would be honest — but it would also make the column's absence unrepresentable, and E5's
-- expense work may yet want "the owner has not chosen" as a distinct state. Nullable costs nothing
-- here (no reader branches on it; `currencySign` falls back to the code) and keeps that door open.
-- No DEFAULT, for V13's and V19's reason: every INSERT path supplies the value, so a default is dead
-- weight carrying a spelling nobody uses. The PHP default is a DOMAIN decision and lives in Java,
-- where it can be read, tested and changed — not in DDL where it would be invisible to the story.
ALTER TABLE itinerary ADD COLUMN currency TEXT;

-- Backfill: the unanimous non-blank currency of the trip's own activities when they agree, else PHP.
--
-- "Unanimous" is the only inference that is honest. A trip whose activities all say THB was priced
-- in THB by someone who meant it, and relabelling it PHP would silently restate real money. A trip
-- with a mix has no answer this migration could derive — the owner has to choose — so it takes the
-- PHP default (founder, 2026-08-18: "default to PH peso for now") and the activity rows keep their
-- own stored currency untouched, which is what makes the fallback safe rather than lossy.
--
-- COUNT(DISTINCT ...) = 1 is the unanimity test; upper(trim(...)) normalises the comparison so
-- 'php' and ' PHP ' are one currency, and MIN() then picks that single surviving value. NULLIF on
-- the trimmed value is what makes a blank string count as absent rather than as a distinct currency
-- (V7 made cost_currency nullable, and blanks exist in the wild alongside NULLs).
UPDATE itinerary i
SET currency = COALESCE(
        (SELECT MIN(upper(trim(a.cost_currency)))
         FROM activity a
                  JOIN day d ON d.id = a.day_id
         WHERE d.itinerary_id = i.id
           AND NULLIF(trim(a.cost_currency), '') IS NOT NULL
         HAVING COUNT(DISTINCT upper(trim(a.cost_currency))) = 1),
        'PHP');

-- The scalar destination, backfilled KEEP-FIRST from the list.
--
-- Keep-first is destructive and was chosen with the alternative (joining the entries into one string)
-- declined on the record, 2026-08-18. It is safe in practice for a reason specific to this data: the
-- overwhelming population of multi-entry rows is seeder fixtures, and the seeder appended its DERIVED
-- REGION last — so keep-first retains the place a human authored and drops the machine's noise.
-- Joining would have produced "Palawan · Philippines" as a destination nobody typed and every
-- destination filter would then miss it.
--
-- COALESCE guards the empty array: V3's NOT NULL permits '{}', and destinations[1] of an empty array
-- is NULL, which would violate the NOT NULL this migration is about to set. `ItineraryFields` has
-- rejected an empty list since V3, so no such row is reachable through the application — the guard is
-- here so that if one exists anyway, the migration completes rather than aborting a deployment on a
-- row nobody can see.
--
-- The fallback is the TITLE, not an invented place name. Keep-first is the approved backfill and
-- nothing authorises minting a destination out of nothing; a title is at least something the traveler
-- actually wrote, and every itinerary has one (V3 NOT NULL). A row that lands here is visible as odd
-- rather than quietly plausible, which is the point.
ALTER TABLE itinerary ADD COLUMN destination TEXT;

UPDATE itinerary
SET destination = COALESCE(NULLIF(trim(destinations[1]), ''), title);

ALTER TABLE itinerary ALTER COLUMN destination SET NOT NULL;

-- And the list goes. Dropping rather than leaving it dormant is deliberate: a retained column with no
-- writer is a second source of truth that drifts silently the moment anything reads it by accident,
-- and the whole point of this story is that the trip has ONE destination. The data is not recoverable
-- after this — that is what the owner approved.
ALTER TABLE itinerary DROP COLUMN destinations;
