-- V21 — the lifecycle gains a fourth rung, and `active` is renamed (ADR-020, founder-ruled 2026-08-04).
--
-- THE LADDER, before and after:
--
--   V12/V20:  draft → active    → completed
--   V21:      draft → upcoming  → ongoing    → completed
--
-- WHAT THE NEW RUNG IS FOR. ADR-019's three-state ladder fused two facts into `active`: *planning
-- is finished* and *the trip is being lived*. The create-itinerary flow needed a terminal act, and
-- the only honest one — "I am done planning" — had nowhere to land: `draft` denies it, `active`
-- overclaims it, and `completed` asserts a trip that never happened. That last option is the one
-- V20 explicitly refused to write for the rows it migrated (see its THE ONE INCONSISTENCY block),
-- so minting the missing state is the consistent answer rather than a new indulgence. `upcoming`
-- is where **Finish Planning** lands.
--
-- WHY THE RENAME, and why it is not cosmetic. With `upcoming` holding "planning finished", the old
-- `active` holds exactly one fact — the trip is being lived — and `ongoing` is what that fact is
-- called in every surface the founder drew. Two unrelated `active`s would otherwise sit one join
-- apart: this column's, and `workspace.state`'s ACTIVE (which means *not archived* and is
-- untouched here). The glossary called that collision out at S4.9 and kept them apart by warning;
-- ADR-020 dissolves it by renaming, so the warning can retire. THE WORKSPACE COLUMN KEEPS ITS
-- WORD — nothing below touches `workspace`.
--
-- WIRE BREAK, WAIVED ON THE RECORD. `active` leaves the wire and `upcoming` joins it: the fifth
-- ADR-008 waiver in this story family, on the standing ground that every installed client is a
-- founder's own. `ItineraryState.parse` deliberately does NOT accept the retired word — a client
-- still sending it takes a validation error rather than being silently understood, which is the
-- honest failure for a break we have chosen to make.
--
-- THE REMAP IS TOTAL AND MECHANICAL. Every `ACTIVE` row becomes `ONGOING`; `DRAFT` and `COMPLETED`
-- keep their values. No row can already read `UPCOMING` — the value has never existed — so nothing
-- is ambiguous and no row needs interpreting. This is a pure rename of one value, which is why it
-- can be one UPDATE where V20 needed two.
--
-- INVISIBLE TO EVERY TEST SURFACE THIS REPO OWNS, AND THIS TIME THERE ARE REAL ROWS TO LOSE. The
-- local stack is fresh-DB-every-redeploy, Testcontainers boots empty schemas, CI likewise — on all
-- of them this UPDATE touches zero rows and reports success whether it is right, backwards, or a
-- typo. Deployed `dev` is the ONLY database that has ever held a non-DRAFT row: S4.11's AC-12 walk
-- counted 8 draft / 1 active / 1 complete there. So the one row this migration exists for lives
-- somewhere no test can reach, and a missed remap would surface as a trip that has silently
-- vanished from every lifecycle section — an empty screen, not an error. `ItineraryLifecycleRenameIT`
-- manufactures the pre-V21 shape on its own container and asserts every arm; the same discipline as
-- V5, V13, V20 and the CLAUDE.md rule learned at S1.1.

-- Assert the precondition rather than trusting it — V18's and V20's opening move, for their reason.
-- A value this migration cannot classify would pass through the UPDATE untouched and land as a
-- lifecycle state the enum can no longer parse, which fails at READ time, far from here, as a
-- deserialization error naming nothing about a migration.
DO $$
DECLARE stray CONSTANT BIGINT :=
    (SELECT count(*) FROM itinerary WHERE state NOT IN ('DRAFT', 'ACTIVE', 'COMPLETED'));
BEGIN
    IF stray > 0 THEN
        RAISE EXCEPTION
            'V21 expected every itinerary to read DRAFT, ACTIVE or COMPLETED, found % that do not', stray;
    END IF;
END $$;

-- Upper-case because @Enumerated(STRING) writes the enum NAME. `ItineraryLifecycleStorageIT` pins
-- that spelling so a later migration cannot reintroduce a lower-case form — V3's `DEFAULT 'draft'`
-- is the trap this repo already sprang once, and V12 removed the bait rather than leave it.
UPDATE itinerary SET state = 'ONGOING' WHERE state = 'ACTIVE';

-- Nothing is added and nothing is dropped: the lifecycle has always been one TEXT column, and a
-- fourth legal value costs no schema. `upcoming` arrives the first time a traveler taps Finish
-- Planning; no existing row can be backfilled into it, because no existing row has ever been
-- through a planning step that the product did not have until today.
