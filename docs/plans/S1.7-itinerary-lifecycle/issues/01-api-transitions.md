# 01 — Lifecycle transitions end-to-end on the API

**What to build:** the server learns a trip started and ended — from the owner, and no one else. Two guarded acts on the itinerary surface; every wrong caller and wrong moment refused in ladder order; each timestamp stamped once, forever. Demoable at the API: start a draft and watch state and stamp flip; try every illegal path and watch it refuse.

1. **Migration (additive):** `started_at` / `completed_at`, nullable timestamps on the itinerary table — plus **drop V3's dead `DEFAULT 'draft'`** (spec decision 10: the CLAUDE.md gotcha names that default as the trap for the next migration that copies its spelling; Hibernate always supplies the value and no other INSERT path exists — non-destructive, founder-signed at the grilling).
2. **Domain:** the itinerary service gains `start` and `complete` — caller's resolved `Membership` in, owner check on the capability object, never inline (Artifact 03). Legality is a strict machine: `start` from `draft` only, `complete` from `active` only — anything else raises the conflict subtype carrying **`ILLEGAL_STATE_TRANSITION`** (one code; the message names from→to; a client's answer to any 409 here is the same — refetch and re-render). No skip edge: `complete` on a `draft` is a 409, per spec decision 9. Each transition stamps its own timestamp; neither touches the last-edited pair (that attributes plan edits) and neither takes the edit lease (a governance act, not a content edit — spec decision 10).
3. **Endpoints (additive):** `POST /v1/itineraries/{id}/start` → 200 + updated itinerary · `POST /v1/itineraries/{id}/complete` → 200 + updated itinerary. No request body — the act carries no data. Ladder S1.5-ordered, authority before state: 401 · 404 guard-mask (non-member) · 403 `NOT_TRIP_OWNER` (S1.6's envelope reused) · 409. The itinerary response is unchanged — `state` has been on the wire since S0.3; the timestamps stay off it until a reader exists (spec decision 6).
4. **The pin:** an IT proving `PATCH /v1/itineraries/{id}` cannot move `state` — the field-edit door and the lifecycle door stay separate, or the machine has an unguarded side entrance (spec decision 7).
5. **Analytics:** `itinerary_started` / `itinerary_completed`, after commit only, none on a 409 (spec decision 11; register #2's standing set).
6. **Tests:** one IT per ladder row for both endpoints (spec ACs 1–2) · write-once: a 409'd re-attempt leaves both stamps unchanged and the last-edited pair untouched (AC 4) · the storage IT — the DB holds `'ACTIVE'` / `'COMPLETED'` (the V4 enum-spelling lesson) and the `state` default is gone (AC 5) · events after commit, one per act (AC 6) · existing guard and plan-edit suites pass unmodified.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Start: 200, `active`, `started_at` set; 401 · 404 non-member · 403 member (`NOT_TRIP_OWNER`) · 409 from `active` and `completed` (spec AC 1)
- [ ] Complete: 200, `completed`, `completed_at` set; 409 from `draft` (no skip edge) and from `completed` (spec AC 2)
- [ ] `PATCH` cannot move `state` — the pin (spec AC 3)
- [ ] Timestamps write-once; last-edited pair untouched by transitions (spec AC 4)
- [ ] Storage IT: enum-name spelling `'ACTIVE'`/`'COMPLETED'` + the `state` default gone (spec AC 5)
- [ ] Events after commit only, one per act, none on a 409 (spec AC 6)
