-- V19 — the three fields the creator dresses a published page with (S4.1 ticket 04, ADR-017 §6).
--
-- All additive, all nullable-or-empty by default, so every existing itinerary keeps rendering: a trip
-- with no standouts and no best-time publishes cleanly and simply shows neither.
--
-- ---------------------------------------------------------------------------------------------
-- V7's comment on `notes` NOW LIES, and it is not editable — read this instead.
--
-- V7 called `notes` "Private planning notes ... 'for your group', not 'for strangers who fork you'".
-- ADR-017 reverses that on the founder's ruling: the field is **Creator Tips**, public on publish and
-- copied on fork (INV-6 plan data). The wire name `notes` stays — renaming is the real additivity
-- break (ADR-008), and the waiver is on record in the S4.1 spec because no real traveler has yet
-- written under the private promise.
--
-- V7 is NOT amended, deliberately: Flyway checksums migration content, so editing an applied
-- migration is green locally and fatal on every rung that has already run it — the E1 promotion gate
-- rejected exactly this edit on V13. The correction lives here, in the migration that ships the
-- reversal, which is the only place it can live and stay true.
-- ---------------------------------------------------------------------------------------------

-- Standouts: the ordered list of short selling points the published Overview renders as check-circle
-- rows ("Big Lagoon Kayaking"). TEXT[] rather than jsonb or a child table, for V3's `destinations`
-- reasons verbatim — a homogeneous list of scalars with no nesting, whose order is the creator's and
-- is therefore the array's. A child table would buy per-row identity nothing reads and nothing edits
-- individually; the editor replaces the whole list under the header lease.
ALTER TABLE itinerary ADD COLUMN standouts TEXT[];

-- NOT NULL with the backfill first and NO default, which is V13's shape and for V13's reason: every
-- INSERT path supplies the value (Hibernate always writes the field), so a default would be dead
-- weight carrying a spelling nobody uses. Empty-array rather than NULL means "no standouts" has one
-- representation instead of two, and the projection never has to ask which kind of nothing it holds.
UPDATE itinerary SET standouts = '{}' WHERE standouts IS NULL;
ALTER TABLE itinerary ALTER COLUMN standouts SET NOT NULL;

-- Best time of year: short free text ("Dec – Apr"), rendered in the header area the 07/18 mock draws.
-- Deliberately unstructured: month enums exist to serve discovery filters, and discovery is S4.3 —
-- structure arrives additively WITH its reader (ship-when-read), not ahead of it where the shape
-- would be guessed.
ALTER TABLE itinerary ADD COLUMN best_time_of_year TEXT;

-- Cover image: the column and the API field ship now, always NULL, with no writer anywhere. S3.3
-- activates upload; until then the editor tile is greyed and the projection renders the placeholder
-- treatment. It ships early on purpose (S4.9's recorded decision) so that S3.3 is an activation
-- rather than a shape change on a live /v1 surface (ADR-008).
ALTER TABLE itinerary ADD COLUMN cover_image_url TEXT;
