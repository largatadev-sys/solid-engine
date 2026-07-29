# 01 — Days end-to-end: the plan gains structure

**What to build:** a traveler creates an itinerary with a duration and gets a day-indexed plan — five days, tabbed, each renamable — editable by *any member* through the guard, while every existing screen and suite stays green. This ticket carries the story's whole additive migration so the schema settles once.

1. **Additive migration (one for the story):** `day` (id, itinerary_id, ordinal, title nullable, timestamps; `UNIQUE (itinerary_id, ordinal)`) · `activity` (full spec shape — built here, read from ticket 02; no `type`/`source` columns, deliberate — spec §noun) · `itinerary` gains `description`, `last_edited_by`, `last_edited_at`. Zero-day itineraries are valid — every pre-S1.3 row; **no backfill, no stepping IT** (spec §migration).
2. **Domain:** `Day` inside the itinerary module (same aggregate, ADR-002). Append (optional title) · rename · delete cascades activities and **renumbers ordinals to stay contiguous** — the aggregate's consistency job (ADR-013). `Itinerary.description` + last-edited stamping on field-bearing writes.
3. **Create flow:** `POST /v1/itineraries` gains optional `description` + `durationDays` (mints N contiguous Days). Factory guards match DTO guards exactly (the S0.3 two-door rule).
4. **Endpoints (additive, member-gated, itinerary-addressed — spec §API):** days POST/PATCH/DELETE · `GET /v1/itineraries/{id}` embeds `days[{id, ordinal, title, activities:[]}]`. All through `requireMember`; **any member writes** (spec: members shape the plan) · non-member 404-mask · visitor 401.
5. **Mobile:** create form rebuilt mock-faithful on existing tokens (title, destination(s), **duration control**, description; dates stay the S0.3 text inputs — ticket 04 upgrades them) · Daily Schedules screen v1: day-tab strip + add-day, day-title field, empty state. Repository/typed-apiClient only (ADR-001). Analytics log events: `day_added/removed`, `itinerary_field_edited` (register #2).
6. **Tests:** contract ITs (create-with-duration, day ops, guard posture on every new endpoint) · storage IT pinning ordinal contiguity through delete-renumber · S0.3/S1.1/S1.2 suites untouched · mobile Jest for the new screens/repository.

**Blocked by:** None — can start immediately.

**Status:** done (2026-07-23) — full backend `verify` green (incl. new `DayStorageIT`, `DayContractIT`; every existing guard/itinerary/invitation/workspace suite unmodified), 286 mobile tests green, typecheck clean; `/code-review` both axes run and every finding fixed. Committed `feat(itinerary): S1.3 ticket 01` on `feature/S1.3-days-and-activities`.

- [x] `durationDays: 5` → five contiguous Days; omitted → zero days and the plan still renders (spec AC 1) — `DayStorageIT` + `DayContractIT.creatingWithADurationReturnsAndEmbedsTheDays` / `creatingWithoutADurationIsAValidZeroDayPlan`
- [x] Delete Day 2 of 5 → activities cascade, ordinals 1–4, contiguity pinned at storage (spec AC 2) — `DayStorageIT.deletingADayRenumbersTheRestToStayContiguous` / `twoDaysCannotShareAnOrdinal`; delete flushes before renumber so the vacated ordinal is free
- [x] A member who is not the owner appends/renames/deletes days (spec AC 4 slice) — `DayContractIT.aMemberWhoIsNotTheOwnerCanBuildTheDaySkeleton`. **Note:** the itinerary `last_edited_by/at` *columns* ship here (V7 + getters), but nothing *writes* them until the PATCH-itinerary endpoint lands at **ticket 04** (spec §API places field-edit there) — so this checkbox's field-edit clause is ticket 04's, as the spec intends; the day-CRUD half is complete.
- [x] Every new endpoint: non-member 404-mask, visitor 401; existing guard suites pass unmodified (spec AC 6) — `DayContractIT.aNonMemberIsMaskedOnEveryDayEndpoint` / `aVisitorWithNoTokenIsRejectedAtTheSecurityChain`; `DayNotFoundException` masks a day of another plan
- [x] Create form + Daily Schedules v1 mock-faithful on tokens — create form gains duration + description; `[id]/days.tsx` renders the tab strip, editable day title, add/delete-with-confirm, empty state, all on theme tokens. Device/preview demo is the story-gate's (ticket 06).

## Comments

**2026-07-23 — three things worth recording.**

1. **Backward-compatible `create`/`draft` overloads, not a churn of every caller.** Adding `description` + `durationDays` to `ItineraryService.create` (and `Itinerary.draft`) would have touched ~10 call sites across the workspace and invitation test suites that create a trip only to have a workspace to act on. Instead the S0.3 shape is kept as a delegating overload (`description = null, durationDays = 0`) — additive by construction, and those suites did not move.

2. **`AfterCommit` extracted to `common.tx` at review.** The after-commit emit block (`isSynchronizationActive` → inline-or-`registerSynchronization`) was about to exist verbatim in three services (Itinerary, Invitation, and the new Day). Code review flagged the third copy; it is now one helper, and all three services delegate. Pre-existing services were re-verified by the full suite.

3. **A latent wire-type bug fixed before it could bite (ticket 02's trap avoided).** `ActivityResponse.costAmount` is a `BigDecimal`, which Jackson serialises as a JSON *number* — a JS client would parse it into a float, the exact round-trip money must never take. The mobile type already (correctly) said `string | null`. `@JsonFormat(shape = STRING)` makes the wire honest. Dormant in ticket 01 (activities are always empty), it would have shipped green-but-broken into ticket 02's data. Same family as S0.2's `getTokens()`.
