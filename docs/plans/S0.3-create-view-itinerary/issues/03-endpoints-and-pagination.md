# 03 — Backend: endpoints + the reference pagination implementation

**What to build:** The three endpoints per the spec's locked contract. `POST /v1/itineraries` (201; `title` ≤ 120 non-blank · `destinations: string[]` min 1 non-blank · optional independent `startDate`/`endDate`, `start ≤ end` only when both present; 400 in the standard envelope otherwise). `GET /v1/itineraries/{id}` (200 through the guard; 404 `ITINERARY_NOT_FOUND` otherwise). `GET /v1/itineraries` — **the reference implementation of Artifact 05's one pagination shape:** `{ items, nextCursor }`, mine-only, newest-first via `ORDER BY id DESC` (UUIDv7 keyset: `WHERE id < :cursor`), opaque base64 cursor, `limit` default 20 silently clamped to 100. Response DTO everywhere: `{ id, title, destinations, startDate, endDate, state, visibility, createdAt }`.

**Blocked by:** 02 — reads run through the guard; the AC that matters most here is the guard's first proof.

**Status:** done

- [x] Create → 201, body echoes the DTO with `state: "draft"`, `visibility: "private"`; DB row matches
- [x] Validation matrix → 400 envelope: blank title · empty destinations · blank destination entry · `start > end`; and `start`-only / `end`-only are **accepted**
- [x] **Two travelers: A creates, B `GET`s → 404 byte-identical to a random-id 404** (the guard's first proof, through the full chain)
- [x] No token → 401 `UNAUTHENTICATED` envelope on all three endpoints (S0.2 machinery, one assertion each)
- [x] Pagination walk: >2 pages of seeded rows traversed via `nextCursor` with no duplicates or skips; newest-first; final page has absent/null `nextCursor`; empty list → 200 `{ "items": [] }`; `limit=500` returns 100
- [x] List returns only the caller's itineraries — seeded rows from a second owner never appear
- [x] Collection endpoint never 404s (Artifact 05)

## Comments

**2026-07-16 — implemented. One AC failed first and was worth the failure.**

**`start > end` returned 500, not 400.** The rule lived only in `Itinerary.draft`, which throws `IllegalArgumentException` — correctly read by the taxonomy as *a bug*, so a traveler's typo paged the operator and told the client "something went wrong". Fixed with `@ChronologicalDates`, a class-level Bean Validation constraint on the request record: the same truth told at the boundary, where it can be a 400. The domain factory keeps its copy — dropping it would weaken the type for every non-DTO caller (S4.7's fork), and teaching the factory about HTTP would be worse. Two layers, one rule, different audiences.

**That fix exposed a second bug in the same handler.** A class-level constraint reports as a *global* error with no field attached, so `getFieldErrors()` missed it and the envelope fell back to "That request is not valid." — swallowing the one validation message actually worth showing. Now `getAllErrors()`.

**Three dependencies/handlers the story needed and S0.2 had not:** `spring-boot-starter-validation` (without it `@Valid` is silently inert — no validator on the classpath means the annotation does nothing and a blank title reaches the domain as a 500); `MethodArgumentNotValidException` → 400; and `HttpMessageNotReadableException`/`MethodArgumentTypeMismatchException` → 400 (`/v1/itineraries/not-a-uuid` was a 500 before).

**Pagination fetches `limit + 1`** — the extra row's existence is what says "there is a next page", at the cost of one row rather than a second COUNT against the same index. `ItineraryListIT.aFullPageWithNothingBeyondItStillEndsTheTraversal` pins the boundary that probe exists for.

**`MALFORMED_CURSOR` is a 400**, not a 500: a cursor arrives from outside, so a mangled one is a client error. Unmapped it would be an `IllegalArgumentException` → 500 at ERROR — the wrong answer plus a page about someone else's typo.
