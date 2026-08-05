-- V22 — the activity's booking card (S4.13, founder-ruled 2026-08-04).
--
-- WHAT THIS RECORDS, and the word that decides the shape: PROVENANCE. The founder's ruling was
-- *"it's what the traveler used for booking — so if people fork that itinerary, they could just
-- use the booking link they used"*. Not an offer menu, not a comparison of ways to book: the one
-- booking that actually happened. That is why there is ONE card per activity and no join table —
-- the drawn card's "PROVIDER 1" header and its add-another affordance were seen and overruled, and
-- the repeatable version stays parked on the epic map with its E2/E4/E6 cross-questions intact.
--
-- FOUR COLUMNS, THREE NEW. The link half already exists: `external_url` has been on this table
-- since V7 and is E6's unfurl target. It becomes the card's Target URL rather than being duplicated,
-- which is why this migration adds three columns and not four, and why nothing on the wire is
-- renamed, retyped or removed — ADR-008-clean, no waiver needed (the story's waiver covers the
-- lifecycle rename only).
--
-- ALL NULLABLE, DELIBERATELY, AND NOT ONLY BECAUSE MOST ACTIVITIES HAVE NO BOOKING. When E6's
-- unfurler lands it derives provider and price from the URL server-side; these columns are then its
-- FALLBACK, not its rival — a hand-typed "Klook" where the unfurl found nothing. A NOT NULL here
-- would force a placeholder into every row and destroy the distinction between *not booked*,
-- *booked, provider unknown*, and *booked via Klook*. The S4.12 goals-emptiness trap, avoided in
-- advance: a nullable column can say "not asked"; a non-null one cannot.
--
-- THE DUPLICATION IS DELIBERATE AND ON THE RECORD. `booking_price_amount` sits beside V7's
-- `cost_amount`, and they can disagree. The grilling raised exactly that — the activity's estimated
-- cost is the creator's own framing of what the thing costs (S4.1: creator-stated, uninterpreted),
-- while the booking price is what one traveler actually paid one provider. The founder ruled *"put
-- everything and stay true to the card"*. Neither derives from the other, nothing reconciles them,
-- and the derived trip total keeps reading `cost_amount` alone — EstimatedCost is untouched by this
-- migration, which is the mechanical statement of that decision.
--
-- NUMERIC(12,2) matches `cost_amount` exactly rather than choosing its own precision: two money
-- columns on one table that round differently is a bug waiting for the first currency where it
-- matters. TEXT for the currency, as V7 chose, with the length bound enforced in ActivityFields
-- where every other bound on this table lives.

ALTER TABLE activity ADD COLUMN booking_purpose        TEXT;
ALTER TABLE activity ADD COLUMN booking_provider       TEXT;
ALTER TABLE activity ADD COLUMN booking_price_amount   NUMERIC(12,2);
ALTER TABLE activity ADD COLUMN booking_price_currency TEXT;

-- No backfill and no default: every existing activity genuinely has no booking recorded, which is
-- what NULL says. Inventing a value here would assert a booking nobody made — the same falsehood
-- V20 refused for lifecycle states and V21 refused for `upcoming`.
