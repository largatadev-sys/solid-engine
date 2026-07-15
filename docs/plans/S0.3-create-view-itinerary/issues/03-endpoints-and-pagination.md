# 03 — Backend: endpoints + the reference pagination implementation

**What to build:** The three endpoints per the spec's locked contract. `POST /v1/itineraries` (201; `title` ≤ 120 non-blank · `destinations: string[]` min 1 non-blank · optional independent `startDate`/`endDate`, `start ≤ end` only when both present; 400 in the standard envelope otherwise). `GET /v1/itineraries/{id}` (200 through the guard; 404 `ITINERARY_NOT_FOUND` otherwise). `GET /v1/itineraries` — **the reference implementation of Artifact 05's one pagination shape:** `{ items, nextCursor }`, mine-only, newest-first via `ORDER BY id DESC` (UUIDv7 keyset: `WHERE id < :cursor`), opaque base64 cursor, `limit` default 20 silently clamped to 100. Response DTO everywhere: `{ id, title, destinations, startDate, endDate, state, visibility, createdAt }`.

**Blocked by:** 02 — reads run through the guard; the AC that matters most here is the guard's first proof.

**Status:** ready-for-agent

- [ ] Create → 201, body echoes the DTO with `state: "draft"`, `visibility: "private"`; DB row matches
- [ ] Validation matrix → 400 envelope: blank title · empty destinations · blank destination entry · `start > end`; and `start`-only / `end`-only are **accepted**
- [ ] **Two travelers: A creates, B `GET`s → 404 byte-identical to a random-id 404** (the guard's first proof, through the full chain)
- [ ] No token → 401 `UNAUTHENTICATED` envelope on all three endpoints (S0.2 machinery, one assertion each)
- [ ] Pagination walk: >2 pages of seeded rows traversed via `nextCursor` with no duplicates or skips; newest-first; final page has absent/null `nextCursor`; empty list → 200 `{ "items": [] }`; `limit=500` returns 100
- [ ] List returns only the caller's itineraries — seeded rows from a second owner never appear
- [ ] Collection endpoint never 404s (Artifact 05)

## Comments
