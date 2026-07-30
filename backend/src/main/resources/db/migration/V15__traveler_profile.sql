-- V15 — the Traveler profile: handle, avatar, bio, and the onboarding answers (S4.0 tickets 03/04).
--
-- ADR-015 ships the handle; ADR-009's candidate-capability note for this story is a considered
-- "none". Every column below is NULLABLE, which is what makes this migration purely additive in the
-- sense that matters: every traveler row that already exists stays legal without being touched. There
-- is NO BACKFILL, deliberately (spec decision 11) — an existing account walks the onboarding flow on
-- its next sign-in and fills these in itself, which is also how founders get handles before S4.3
-- renders them. No backfill means no stepping-IT: the V5 lesson applies where rows must be rewritten,
-- and here none are.
--
-- Completeness is DERIVED, never enforced server-side (spec decision 11): no /v1 endpoint refuses an
-- incomplete profile, because that would add a failure mode to already-shipped endpoints and break
-- installed clients (ADR-008). `TravelerNegativeControlIT` is the standing proof.

ALTER TABLE traveler
    -- The @handle (ADR-015): 3-20 chars of a-z 0-9 _, stored lowercase, globally unique
    -- case-insensitively, freely changeable, released immediately on change. NULL until the profile
    -- step runs, which is exactly what the client's routing gate tests for.
    --
    -- The ID REMAINS THE IDENTIFIER EVERYWHERE — routes, FKs, any future URL. That single rule is
    -- what makes "freely changeable" safe: nothing in the system points at a traveler by handle, so
    -- releasing one breaks no reference. Nothing here enforces that rule; it is a design constraint
    -- and its guard is review, not SQL.
    ADD COLUMN handle                  TEXT,

    -- The Google photo URL for a Google sign-up; NULL for an email sign-up, whose avatar is drawn
    -- from initials on the client. Upload is absent until S3.3 (spec decision 8) — the column is not
    -- a dead affordance, it is where the Google import lands today.
    ADD COLUMN avatar_url              TEXT,

    -- Free text, shipped knowingly reader-less (spec decision 6, the fourth instance of the
    -- mechanism-before-reader pattern): its reader is E4's profile surface.
    ADD COLUMN bio                     TEXT,

    -- Travel setup (spec decision 7). country is an ISO 3166-1 alpha-2 code, preferred_currency an
    -- ISO 4217 code; both prefill from the device locale with a Philippines/PHP fallback. home_city
    -- stays FREE TEXT on purpose — Place Search is a reserved future term and this column must not
    -- quietly become its storage.
    --
    -- preferred_currency means ONE thing: the default for E5 expense logging. There is no FX
    -- anywhere in the roadmap and this column must not start implying one.
    ADD COLUMN country                 TEXT,
    ADD COLUMN preferred_currency      TEXT,
    ADD COLUMN home_city               TEXT,

    -- The onboarding answers (spec decisions 5 and 6). Postgres arrays rather than join tables: they
    -- are a closed set of short tokens read and written only as a whole, with no query that filters
    -- on a single element and no per-element attribute to hang on a row. A join table would buy
    -- nothing and cost two more tables to migrate. TravelerProfileStorageIT pins the mapping, which
    -- is the part that could rot silently.
    --
    -- "earn" lives in goals as SIGNAL ONLY (spec decision 5): it is stored and analytics-measured,
    -- and carries no product promise. Creator monetization is outside the roadmap.
    ADD COLUMN goals                   TEXT[],
    ADD COLUMN interests               TEXT[],

    -- The onboarding marker (spec decision 11). Its presence plus a non-NULL handle is what the
    -- CLIENT reads to decide whether to route into the flow. A timestamp rather than a boolean
    -- because "when" is free to keep and answers questions a boolean cannot.
    ADD COLUMN onboarding_completed_at TIMESTAMPTZ;

-- Case-insensitive global uniqueness, expressed as the thing it means rather than as a pair of rules
-- that happen to add up to it (ADR-015).
--
-- A plain UNIQUE (handle) beside a CHECK (handle = lower(handle)) would enforce the SAME behaviour
-- through the application — and would be untestable, because with the CHECK in place no mixed-case
-- row can exist for the uniqueness to disagree about. The two outcomes would be indistinguishable:
-- exactly the class of non-check this repo has now been burned by three times (S0.6's /gsi/button,
-- S1.1's deploy probe). Written as lower(handle), the constraint has a failure mode you can trip:
-- insert 'Ana' then 'ana' by raw SQL and it must refuse. TravelerHandleStorageIT does precisely that,
-- and it was confirmed to FAIL when the index was sabotaged to a plain (handle).
--
-- Partial, so the many NULL handles of un-onboarded travelers do not collide with each other.
-- (Postgres would allow that anyway — NULLs are distinct in a unique index — but stating it keeps the
-- index carrying only rows that can conflict.)
CREATE UNIQUE INDEX traveler_handle_idx ON traveler (lower(handle)) WHERE handle IS NOT NULL;
