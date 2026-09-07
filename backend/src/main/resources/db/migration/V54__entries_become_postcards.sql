-- V54 — every old entry becomes a postcard, with its id kept (CM-2 ticket 07, ADR-036).
--
-- The cutover. CM-1 built the new tables dark; CM-2 ticket 06 turned the old entry endpoints into
-- adapters over them. This migration moves the rows that were written before that, so a traveler
-- who posted last week sees every postcard exactly where it was.
--
-- IDS ARE PRESERVED, and that is the whole design. A photo's subject_id is its entry's id, and a
-- shared link carries it; minting new ids would orphan every photo in the object store and break
-- every link in the wild. Preservation also makes the migration idempotent-by-construction: the
-- INSERT ... ON CONFLICT DO NOTHING below cannot double-write a row that is already there.
--
-- The order matters and is the reverse of the read: diaries first (postcards reference them), then
-- days (postcards reference them), then postcards, then the photo re-point.
--
-- One derived diary per (author, trip) that has entries, carrying the trip's title, destination and
-- dates — the same four fields the live mint snapshots. A trip that has since been destroyed leaves
-- a dangling trip_id by design (V50/V51's survival rule), and its diary takes a placeholder title
-- and the entry's own timestamps for dates, because there is no trip left to read them from.
--
-- One diary day per distinct trip day among an author's entries. The day is resolved from the
-- activity where the activity still exists; where it does not, the entry's own "Day N" label is the
-- only surviving evidence of which day it was, so the ordinal is parsed back out of it. An entry
-- whose label parses to nothing lands on day 1 — a postcard with no day would be invisible on the
-- new profile, and a wrong day is recoverable while a lost postcard is not.
--
-- The diary day's date is derived from the diary's start plus the ordinal, matching mintTripDay.

INSERT INTO diary (id, author_id, trip_id, title, destination, start_date, end_date,
                   created_at, updated_at)
SELECT
    gen_random_uuid(),
    e.traveler_id,
    e.itinerary_id,
    COALESCE(i.title, 'A trip'),
    i.destination,
    COALESCE(i.start_date, min(e.created_at)::date),
    COALESCE(i.end_date, i.start_date, max(e.created_at)::date),
    min(e.created_at),
    max(e.updated_at)
FROM diary_entry e
LEFT JOIN itinerary i ON i.id = e.itinerary_id
GROUP BY e.traveler_id, e.itinerary_id, i.title, i.destination, i.start_date, i.end_date
ON CONFLICT (author_id, trip_id) WHERE trip_id IS NOT NULL DO NOTHING;

-- The ordinal an entry belongs to: the activity's real day where it survives, else the number in
-- the snapshotted "Day N" / "Day N: Title" label, else 1.
CREATE OR REPLACE FUNCTION largata_backfill_ordinal_of(activity_day_ordinal INTEGER, day_label TEXT)
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$
    SELECT COALESCE(
        activity_day_ordinal,
        NULLIF(regexp_replace(COALESCE(day_label, ''), '^Day\s+(\d+).*$', '\1'), day_label)::INTEGER,
        1)
$$;

INSERT INTO diary_day (id, diary_id, ordinal, date, trip_day_id, trip_day_title,
                       created_at, updated_at)
SELECT DISTINCT ON (d.id, largata_backfill_ordinal_of(day.ordinal, e.day_label))
    gen_random_uuid(),
    d.id,
    largata_backfill_ordinal_of(day.ordinal, e.day_label),
    d.start_date + (largata_backfill_ordinal_of(day.ordinal, e.day_label) - 1),
    day.id,
    day.title,
    min(e.created_at) OVER (PARTITION BY d.id,
                            largata_backfill_ordinal_of(day.ordinal, e.day_label)),
    min(e.created_at) OVER (PARTITION BY d.id,
                            largata_backfill_ordinal_of(day.ordinal, e.day_label))
FROM diary_entry e
JOIN diary d ON d.author_id = e.traveler_id AND d.trip_id = e.itinerary_id
LEFT JOIN activity a ON a.id = e.activity_id
LEFT JOIN day ON day.id = a.day_id
ON CONFLICT (diary_id, date) DO NOTHING;

-- A diary whose entries reach past its recorded end date widens to cover them, the same rule
-- coverDay applies at runtime.
UPDATE diary d
SET end_date = widest.last_date
FROM (SELECT diary_id, max(date) AS last_date FROM diary_day GROUP BY diary_id) AS widest
WHERE widest.diary_id = d.id AND widest.last_date > d.end_date;

INSERT INTO postcard (id, author_id, diary_id, diary_day_id, trip_id, activity_id,
                      activity_title, day_label, time_of_day, place, caption,
                      created_at, updated_at)
SELECT
    e.id,
    e.traveler_id,
    d.id,
    dd.id,
    e.itinerary_id,
    e.activity_id,
    e.activity_title,
    e.day_label,
    e.time_of_day,
    e.place,
    e.caption,
    e.created_at,
    e.updated_at
FROM diary_entry e
JOIN diary d ON d.author_id = e.traveler_id AND d.trip_id = e.itinerary_id
LEFT JOIN activity a ON a.id = e.activity_id
LEFT JOIN day ON day.id = a.day_id
JOIN diary_day dd
  ON dd.diary_id = d.id
 AND dd.ordinal = largata_backfill_ordinal_of(day.ordinal, e.day_label)
ON CONFLICT (id) DO NOTHING;

-- The media seam keeps serving the same photo ids: only the subject label moves.
UPDATE photo
SET subject_kind = 'POSTCARD'
WHERE subject_kind = 'DIARY_ENTRY'
  AND subject_id IN (SELECT id FROM postcard);

DROP FUNCTION largata_backfill_ordinal_of(INTEGER, TEXT);
