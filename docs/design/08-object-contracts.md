# 08 · Object Contracts — the four-object wire reference  `[PRODUCTION DEPTH]`

*Minted at CM-1 ticket 08 (2026-08-30); the Diary re-cut to the day grain at CM-2 (ADR-036). This is the single reference the rewire story and every later UI story wire against. The new world's endpoints below are **live but dark**: they ship in the backend, fully tested at the API seam, and nothing in the product calls them until the rewire cuts the client over. ADR-035 records the decisions; `docs/plans/CM-1-content-module/spec.md` records the story.*

---

## The four objects

The Trip Tree, as the founder ruled it across the CM-1 grilling:

| Object | What it is | Module | Table | Authority over it |
|---|---|---|---|---|
| **Trip** | The journey-object and its workspace world: plan, chat, polls, dump, members. Dies whole when the owner destroys it. | `com.largata.trip` | the **existing** `itinerary` record — no new table, ever (B-fork rule 4: trip data never forks) | Membership, through the guard; destruction is the owner's alone |
| **Itinerary** | The published page: a real object **minted from the frozen plan at publish**, with an identity that survives publish cycles and the trip's destruction. | `com.largata.publication` *(working name — `com.largata.itinerary` is the frozen old world; the rename is a free refactor after the rewire deletes it)* | `itinerary_object` | The recorded owner (snapshotted at mint) |
| **Diary** | A trip that was taken: title, destination, the dates it spanned, a cover, made of **Diary Days** that hold postcards. Standalone, or derived one-per-author-per-trip. Deleting it takes everything under it. | `com.largata.diary` | `diary`, `diary_day` | Authorship |
| **Postcard** | The atom: 1–5 photos + caption + optional place. Loose, or on exactly one **Diary Day**. Born three ways: from an activity (one per activity per author), on a trip day with no activity, or from nowhere. | `com.largata.postcard` | `postcard` | Authorship — the only authority over content, including delete across the archive freeze |

## Wire ↔ vocabulary mapping

The wire's nouns predate the Trip/Itinerary split (S4.15, register #3) and are frozen by ADR-008. This table is the mapping-table core of the vocabulary-housekeeping backlog line; the rest of that line stays parked.

| Wire root | What it actually is | Since |
|---|---|---|
| `/v1/itineraries/**` | **The Trip** — its record, plan, lifecycle, workspace surfaces. The noun is historical (ADR-013) and never moves. | S1.x, frozen |
| `/v1/published-itineraries/{id}` | The old world's published page — a live projection over the trip's rows. Superseded by the minted object at the rewire; stays on the wire per ADR-008. | S4.1 |
| `/v1/trips/**` | **The Trip, in its own vocabulary** — the new world's grammar (CM-1, dark). | CM-1 |
| `/v1/publications/{id}` | **The Itinerary object** — the minted published page. The root says "publications" because every itinerary-flavored spelling is squatted on by the frozen old world; the *entity and every traveler-facing word stay "Itinerary"*. | CM-1 |
| `/v1/diaries/**` | **The Diary** entity. | CM-1 |
| `/v1/postcards/**` | **The Postcard** entity. The old world's postcard is `/v1/itineraries/{id}/diary/entries/**` (a Diary Entry — same concept, trip-rooted shape). | CM-1 |

## The new world's contract

Every endpoint requires a signed-in traveler (the standard `UNAUTHENTICATED` 401 envelope otherwise). Masking follows the house pattern: whatever you may not touch answers as if it did not exist.

### Trip — `/v1/trips`

| Act | Endpoint | Authority | Answer | Refusals |
|---|---|---|---|---|
| Read the trip's face | `GET /v1/trips/{tripId}` | any member (archived: owner only — the audience-fence posture) | `{id, title, destination, startDate, endDate, state, published, archived, viewerRole, createdAt}` — the old listing's truth from the same records | non-member, or member of an archived trip: `404 TRIP_NOT_FOUND` |
| **Destroy the trip** | `DELETE /v1/trips/{tripId}` | **owner only, any lifecycle state — published and archived alike** | `204`. One transaction destroys the workspace world: plan (days, activities, history, leases), chat, polls with options and votes, photo dump, cover, memberships, invitations, join link and requests, ownership records, the workspace row, the itinerary record — and every workspace-world photo's rows **and stored objects**. | member: `403 NOT_PERMITTED` (named — destructive authority stays with the owner; recourse is Leave) · non-member and repeat delete: `404 TRIP_NOT_FOUND` |

**Irreversible.** No undo, no bin (the 30-day bin is its own parked story). **What survives, by structure:** the minted itinerary object, every member's diaries and postcards, the old world's diary entries (V52 dropped the cascade), forked copies and their `fork_relationship` rows. Dark rule 3: no UI calls destruction until the rewire — before the readers move, the old feed would mis-hide a destroyed trip's surviving old-world postcards.

### Itinerary object — publish acts on `/v1/trips`, the object at `/v1/publications`

| Act | Endpoint | Authority | Answer | Refusals |
|---|---|---|---|---|
| Publish = mint | `POST /v1/trips/{tripId}/publish` | owner; trip must be `completed` | `200` with the object: `{id, tripId, publishedAt, plan}` — `plan` is the frozen document (header facts + days + activities, textual). Also flips the **same trip record** the old world reads (`published`, `published_at` — `visibility` is a constant `public` shim since V48) — one truth, never forked. First publish mints; republish **refreshes the same object** — the id never changes across cycles (`UNIQUE(trip_id)` makes this structural). | member: `403 NOT_PERMITTED` · stranger: `404 TRIP_NOT_FOUND` · not completed: `409 ITINERARY_NOT_COMPLETE` · bad audience: `400 UNKNOWN_AUDIENCE` |
| Unpublish = retire | `POST /v1/trips/{tripId}/unpublish` | owner | `204`. The object retires (reads mask) **but keeps its id** — every link ever shared resurrects on republish. The trip record flips back. | member: `403 NOT_PERMITTED` · stranger: `404 TRIP_NOT_FOUND` · nothing live to retire: `404 PUBLICATION_NOT_FOUND` |
| Read the page | `GET /v1/publications/{objectId}` | any signed-in traveler the **recorded owner's** Profile Visibility admits (S4.39, ADR-034); a stranger to a private owner: `403 PROFILE_PRIVATE` | `200` `{id, tripId, publishedAt, plan}` | retired or absent: `404 PUBLICATION_NOT_FOUND` |
| Hard delete | `DELETE /v1/publications/{objectId}` | the **recorded owner** — works when the creator trip no longer resolves (the orphaned page is never unwithdrawable) | `204`, permanent. If the creator trip still exists, its `published` flag clears too (the new world's invariant: published ⇒ object exists). | non-owner: `404 PUBLICATION_NOT_FOUND` (masked) · repeat: `404` |

**Snapshot honesty:** the plan document is textual — titles, labels, times, places, costs, tips, booking facts. It carries the trip's `coverImageUrl` string, but the cover *photo* is workspace media and dies with the trip; whether the published page copies media into its own custody is a rewire-story question, recorded here so nobody reads the dangling URL as a bug.

### Diary — `/v1/diaries`

*Re-cut at CM-2 (ADR-036): a diary is a trip that was taken. It carries what a trip carries — a title, a destination, the dates it spanned, a cover — and its postcards hang off **Diary Days**, mirroring Trip → Day → Activity. CM-1's title-only create is gone from the contract.*

| Act | Endpoint | Authority | Answer | Refusals |
|---|---|---|---|---|
| Create (standalone) | `POST /v1/diaries` body `{title, startDate, endDate, destination?, pin?}` | any traveler; many diaries each | `201` the diary, plus **`candidateDates`** — one date per day in the range, **none of them stored**. The memory setup renders these as day cards; a day becomes a row only when it takes a place or a postcard. | blank title: `400 DIARY_NEEDS_A_TITLE` · >120 chars: `400 DIARY_TITLE_TOO_LONG` · missing either date: `400 DIARY_NEEDS_ITS_DATES` · end before start: `400 DIARY_ENDS_BEFORE_IT_STARTS` · a start in the future: `400 DIARY_HAS_NOT_HAPPENED_YET` · over 365 days: `400 DIARY_TOO_LONG` · a pin with no name: `400 INVALID_PIN` · a pin off the earth or at a zoom the provider does not serve: `400 INVALID_PIN` |
| List mine | `GET /v1/diaries?cursor&limit` | author (own list only) | standard cursor page of diary summaries | — |
| Read one | `GET /v1/diaries/{diaryId}` | any signed-in traveler the **author's** Profile Visibility admits (S4.39, ADR-034); a stranger to a private author: `403 PROFILE_PRIVATE` | `200` — the four fields, the **cover**, `postcardCount`, `dayCount`, and `days[]` **in ordinal order with their postcards inside**, each day carrying its own `place` and `postcardCount` (which is what the delete confirm shows) | absent: `404 DIARY_NOT_FOUND` |
| Edit | `PATCH /v1/diaries/{diaryId}` body `{title, startDate, endDate, destination?, pin?}` | author | `200`. **Changing the dates never creates or deletes a day** — a day outside the new range keeps standing, with the ordinal it was born with. | non-author: `404 DIARY_NOT_FOUND` (masked) · the create's validation refusals, by the same names |
| Set cover | `PUT /v1/diaries/{diaryId}/cover` — multipart `photo` | author | `200` the diary. Replaces any existing cover; a diary holds one. | non-author: `404 DIARY_NOT_FOUND` (masked) |
| Remove cover | `DELETE /v1/diaries/{diaryId}/cover` | author | `200` the diary, whose `cover` then falls back to its **first postcard photo** | non-author: `404 DIARY_NOT_FOUND` (masked) |
| **Delete** | `DELETE /v1/diaries/{diaryId}` | author | `204`. **The diary, its days, every postcard on them, their photo rows and stored objects, and its cover are destroyed in one transaction** (founder-ruled containment). Loose postcards and other diaries stand. | non-author: `404 DIARY_NOT_FOUND` (masked) · repeat: `404` |

**The two births.** *Standalone*, from the memory setup above — no trip reference, unlimited per author. *Derived*, one per author per trip, minted at that author's first postcard on the trip, **snapshotting the trip's title, destination and dates**; it is the author's to edit afterwards, and a later edit to the trip does not rewrite it. A derived diary takes **no copy of the trip's cover**, for the same reason it takes no reference to it. One derived diary per traveler per trip is a partial unique index, race-safe; deleting it is allowed, and the next post re-mints a fresh one.

A memory **never creates a trip row** (grilling ruling 1).

### Diary Day — `/v1/diaries/{diaryId}/days`

| Act | Endpoint | Authority | Answer | Refusals |
|---|---|---|---|---|
| Add a day | `POST /v1/diaries/{diaryId}/days` body `{date, place?, pin?}` | author | `201` the day. Its **ordinal is the date's distance from the diary's start, plus one** — so filling Mar 15, 16 and 19 of a Mar 15–19 diary reads **Day 1, Day 2, Day 5**: a skipped day leaves a gap rather than renumbering its neighbours. A date **outside the range extends the range** to include it. | no date: `400 DIARY_DAY_NEEDS_A_DATE` · a day already on that date: `409 DIARY_DAY_ALREADY_EXISTS` · place >200 chars: `400 DIARY_DAY_PLACE_TOO_LONG` · non-author: `404 DIARY_NOT_FOUND` (masked) · a pin with no name: `400 INVALID_PIN` · a pin off the earth or at a zoom the provider does not serve: `400 INVALID_PIN` |
| Edit the place | `PATCH /v1/diaries/{diaryId}/days/{dayId}` body `{place, pin?}` | author | `200`. **A day's date and ordinal are immutable after birth**; days never reorder. | non-author: `404 DIARY_NOT_FOUND` (masked) · absent: `404 DIARY_DAY_NOT_FOUND` |
| **Delete a day** | `DELETE /v1/diaries/{diaryId}/days/{dayId}` | author | `204`. Its postcards, photo rows and stored objects go with it; **the remaining days keep their ordinals**. | non-author: `404 DIARY_NOT_FOUND` (masked) · absent: `404 DIARY_DAY_NOT_FOUND` |

**Candidates are not rows.** The create's `candidateDates` is the only place an unfilled day exists. **Derived days** mint per trip day at the author's first postcard there, snapshotting the trip day's ordinal and title; a second postcard on the same trip day reuses the day.

### Postcard — `/v1/postcards`, day-bound creation under `/v1/diaries` and `/v1/trips`

*CM-2 gives the postcard a **day reference**: loose, or on exactly one day. Many per day.*

| Act | Endpoint | Authority | Answer | Refusals |
|---|---|---|---|---|
| Create (loose) | `POST /v1/postcards` — multipart: `postcard` JSON `{caption?, place?, pin?, diaryId?}` + `photos` (1–5 files) | any traveler; into one of **their own** diaries or loose | `201` the postcard | no photo: `400 POSTCARD_NEEDS_A_PHOTO` · >5: `400 TOO_MANY_POSTCARD_PHOTOS` · caption >2000: `400 POSTCARD_CAPTION_TOO_LONG` · someone else's diary: `404 DIARY_NOT_FOUND` (masked) · a pin with no name: `400 INVALID_PIN` · a pin off the earth or at a zoom the provider does not serve: `400 INVALID_PIN` |
| Create (on a diary day) | `POST /v1/diaries/{diaryId}/days/{dayId}/postcards` — multipart `postcard` JSON `{caption?, place?, pin?}` + `photos` (1–5) | author of the diary | `201` carrying its `diaryId`, `diaryDayId` and `dayOrdinal` | the create refusals above · non-author: `404 DIARY_NOT_FOUND` (masked) · absent day: `404 DIARY_DAY_NOT_FOUND` |
| Create (on a trip day, no activity) | `POST /v1/trips/{tripId}/days/{dayId}/postcards` — same multipart | trip member; trip started | `201` — **mints the author's derived diary and that day when absent**, carries no activity in the snapshot, and takes the trip day's label. Unlimited per day. | stranger: `404 TRIP_NOT_FOUND` · archived trip: owner `409 TRIP_ARCHIVED`, member masked `404 TRIP_NOT_FOUND` · not started: `400 TRIP_NOT_STARTED` · a day outside this trip: `404 DAY_NOT_FOUND` |
| Create (trip-derived, from an activity) | `POST /v1/trips/{tripId}/activities/{activityId}/postcards` — same multipart, minus `diaryId`/`place` | trip member; trip started; activity of this trip | `201` — the activity's facts are **read through the trip module's interface at post time and snapshotted** (`activityTitle`, `dayLabel`, `timeOfDay`, `place`, `pin`); the author's derived diary auto-mints on first post and is reused after, **and the postcard lands on the diary day mirroring the activity's trip day** | as above, plus foreign/absent activity: `404 ACTIVITY_NOT_FOUND` · same activity again: `409 ACTIVITY_ALREADY_POSTCARDED` (another member posts the same activity freely) |
| Read | `GET /v1/postcards/{postcardId}` | any signed-in traveler the **author's** Profile Visibility admits (S4.39, ADR-034); a stranger to a private author: `403 PROFILE_PRIVATE` | `200`; carries `diaryDayId` and `dayOrdinal`, and **when the postcard has no place of its own, its day's place is what renders**. **Reads tolerate a dangling `activityId`** — the snapshot is what renders, the id is only the trail back. | absent: `404 POSTCARD_NOT_FOUND` |
| Recaption | `PATCH /v1/postcards/{postcardId}` body `{caption}` | author; **respects the archive freeze** (editing is not withdrawal) | `200` | non-author: `404 POSTCARD_NOT_FOUND` (masked) · trip archived: `409 TRIP_ARCHIVED` (named — the caller provably owns the postcard, so there is nothing left to mask) |
| **Move the place** | `PATCH /v1/postcards/{postcardId}/place` body `{place?, pin?}` | author; respects the archive freeze | `200` the postcard at its new place. Its own route rather than another field on the recaption PATCH, which is partial by construction: widening that body would make an omitted place mean "clear it", changing the semantics of something already shipped (ADR-008). | a pin with no name: `400 INVALID_PIN` · a pin off the earth or at an unserved zoom: `400 INVALID_PIN` · non-author: `404 POSTCARD_NOT_FOUND` (masked) · trip archived: `409 TRIP_ARCHIVED` |
| **File onto a day** | `PATCH /v1/postcards/{postcardId}` body `{diaryId, diaryDayId}` | author of both | `200` the postcard, now on that day. **Once only**: a postcard already on a day never moves between days or diaries in CM-2. | non-author of either: `404 DIARY_NOT_FOUND` / `404 POSTCARD_NOT_FOUND` (masked) · already homed: `409 POSTCARD_ALREADY_FILED` |
| **Add photos** | `POST /v1/postcards/{postcardId}/photos` — multipart `photos` (1–5 files) | author; respects the archive freeze | `200` the postcard with its photos, five at most in total | none sent: `400 POSTCARD_NEEDS_A_PHOTO` · past five in total: `400 TOO_MANY_POSTCARD_PHOTOS` · non-author: `404 POSTCARD_NOT_FOUND` (masked) · trip archived: `409 TRIP_ARCHIVED` |
| **Remove a photo** | `DELETE /v1/postcards/{postcardId}/photos/{photoId}` | author; respects the archive freeze | `200` the postcard without it; the stored object and its thumbnail destroyed | the last photo: `400 POSTCARD_NEEDS_A_PHOTO` · a photo that is not this postcard's: `404 PHOTO_NOT_FOUND` · non-author: `404 POSTCARD_NOT_FOUND` (masked) |
| **Delete** | `DELETE /v1/postcards/{postcardId}` | author, **always** — withdrawal of one's own public content is a right: it crosses the archive freeze and consults no trip state, so a member who left (or was removed from) the trip still deletes by this address | `204`, permanent; photo rows and stored objects destroyed. **The day it sat on stands** — delete cascades downward and never upward. | non-author: `404 POSTCARD_NOT_FOUND` (masked) · repeat: `404` |

Postcard photos and diary covers serve through the standard media seam (`GET /v1/media/{photoId}` / `/thumb`) under their module's own audience: the author's Profile Visibility (S4.39, ADR-034), same as reads — a stranger to a private author gets the media seam's masked not-found.

### The Pin, on every object that names a place

A **Pin** is `{lat, lng, zoom}` — nested and nullable, so half a pin is not expressible — and it rides beside the free text that names the place, never instead of it. PL-2 gave it to Activity and Itinerary; CM-2 gives it to the **Diary's destination**, the **Diary Day's place** and the **Postcard's place**, because a memory inherits no destination from a trip row that does not exist (founder ruling, 2026-09-07, reversing PL-2's "postcards and diary entries deliberately carry none" on the ground that the trip whose feed it protected is not part of a standalone memory at all).

Three rules hold identically wherever a pin appears, and each is enforced in the schema as well as the service — the wire shape is a promise the API makes, and the CHECK is the one the database makes:

- **whole or absent** — all three fields, or none;
- **on the earth** — latitude ±90, longitude ±180, zoom 2–19, the provider's range;
- **named** — a pin only where the place it pins is non-blank, so a point never arrives with nothing to call it.

**Editing the text clears the pin** (PL-2's stale-ref rule, strict by founder ruling): a place renamed is a different place until a traveler pins it again. The client applies it before every write, and nothing on the server infers coordinates from text — then or ever, which is why no migration backfills one.

### Error vocabulary

Minted at CM-1: `TRIP_NOT_FOUND` · `PUBLICATION_NOT_FOUND` · `ITINERARY_NOT_COMPLETE` *(spelling shared with the old world's publish gate)* · `UNKNOWN_AUDIENCE` *(shared)* · `TRIP_ARCHIVED` *(shared, from common)* · `TRIP_NOT_STARTED` *(shared spelling)* · `ACTIVITY_NOT_FOUND` *(shared spelling)* · `DIARY_NOT_FOUND` · `DIARY_NEEDS_A_TITLE` · `DIARY_TITLE_TOO_LONG` · `POSTCARD_NOT_FOUND` · `POSTCARD_NEEDS_A_PHOTO` · `TOO_MANY_POSTCARD_PHOTOS` · `POSTCARD_CAPTION_TOO_LONG` · `ACTIVITY_ALREADY_POSTCARDED` · `NOT_PERMITTED` *(shared)* · `INVALID_PIN` *(shared with PL-2, now raised by the memory objects too)*.

Added at CM-2: `DIARY_NEEDS_ITS_DATES` · `DIARY_ENDS_BEFORE_IT_STARTS` · `DIARY_HAS_NOT_HAPPENED_YET` · `DIARY_TOO_LONG` · `DIARY_DAY_NOT_FOUND` · `DIARY_DAY_NEEDS_A_DATE` · `DIARY_DAY_ALREADY_EXISTS` · `DIARY_DAY_PLACE_TOO_LONG` · `POSTCARD_ALREADY_FILED` · `DAY_NOT_FOUND`.

## The existing wire, in Trip Tree vocabulary

The strangler's other half: what the shipped app talks to today, read with the four-object vocabulary. Nothing here moved at CM-1 — not one path, spelling, or semantic (ADR-008; the existing suites pass byte-identical).

| Surface | Endpoints | Vocabulary reading |
|---|---|---|
| **The Trip** (record + lifecycle) | `POST/GET /v1/itineraries` · `GET/PATCH /v1/itineraries/{id}` · `POST …/{id}/start` `…/complete` `…/reopen` `…/archive` `…/unarchive` · `POST …/{id}/finish-planning` *(dormant, permanently refusing)* | The trip's own facts and ladder. `viewerRole`/`memberCount` additive since S4.38. |
| **The Plan** | `POST /v1/itineraries/{id}/days` · `PATCH/DELETE …/days/{dayId}` · `POST/PATCH/DELETE …/days/{dayId}/activities[/{activityId}]` · `POST …/activities/{activityId}/move` · `PUT …/activities/order` · `PUT …/{id}/plan` · `POST/DELETE …/{id}/edit-lock[, /renew]` | The itinerary document a Trip carries, edited under the Editing Session (ADR-023/027). |
| **Publishing (old flow)** | `POST /v1/itineraries/{id}/publish` `…/unpublish` · `GET /v1/itineraries/{id}/preview` · `GET /v1/published-itineraries/{id}` · `POST /v1/itineraries/{id}/fork` | The projection-based published page (ADR-017/019). Runs unchanged through the dark window; the cutover backfill mints objects for currently-published trips, and the rewire decides these endpoints' fate. |
| **Old-world postcards** (Diary Entries) | `POST/GET /v1/itineraries/{id}/diary/entries[/{entryId}]` · `PATCH/DELETE …/entries/{entryId}` · photo add/remove/from-dump · `GET /v1/me/diary/trips` | **ADAPTERS since CM-2 ticket 06** — same paths, same shapes, answered from `postcard`/`diary`/`diary_day`. Nothing writes to `diary_entry` any more (`OldEntryTableIsReadOnlyTest` pins it) and V54 copied every row across with its id preserved. Their deletion is an epic-map line whose trigger is the client's last old-path call going away. The trip-rooted postcard shape (ADR-024). **V52 changed its schema only**: destroying a trip no longer cascades these rows away, and deleting a plan activity leaves `activityId` dangling instead of nulling it — reads render from the snapshot either way. The cutover backfill translates these rows into `postcard`/`diary` rows. |
| **Workspace world** | members/invitations (`/v1/itineraries/{id}/invitations[…]`, `/v1/invitations/{id}/accept|decline|revoke`, `DELETE …/members/{travelerId}`) · ownership offers · polls · chat · photo dump · join links (`/v1/itineraries/{id}/join-link`, `/v1/join/{token}[…]`, join requests) | Everything membership-authorized. All of it is what `DELETE /v1/trips/{id}` destroys. |
| **Feed / discovery / profiles** | `/v1/feed/postcards[…]` · `/v1/discovery/*` · `/v1/travelers/{handle}[…]` · `/v1/me/profile/*` · follow | Readers over the old world's rows. They move at the rewire; until then anything written only into the new tables is invisible to them — which is exactly why the new world ships dark (B-fork rule 1). |
| **Identity / media / infra** | `/v1/me[…]` · `/v1/handles/*` · `/v1/verification-codes[…]` · `/v1/media/{photoId}[…]` · `/v1/ws-ticket` · `/v1/health` · `/v1/reports` | Keeper modules (identity, media, common, verification, report, ws). The new world may import identity and media; the boundary guard forbids everything else. |

## Postures recorded, not invented

- **Read audience is the author's Profile Visibility** (S4.39, ADR-034) for diaries and postcards, and the **recorded owner's** for publications — `AuthoredContentAudience` is the one definition, and a stranger to a private author answers `403 PROFILE_PRIVATE`. CM-1 shipped this as interim public-at-posting; the rot-fix of 2026-09-05 moved it when the branch landed after S4.39. The itinerary object carries **no audience of its own** for the same reason — publish takes no body.
- **Freshness:** nothing here is traveler-visible until the rewire, so every surface's lane note is owed by the rewire story, not this doc.
- **Events: none.** Archive state and activity facts are synchronous interface reads; `TripDeleted` and destruction-time WS eviction arrive with the rewire, when the endpoint gains live callers.
- **The one keeper-module change:** `PhotoSubject` gained the additive `POSTCARD` constant (media is a keeper, not old world; the constant is unreachable through every existing flow).
- **Bean names in the diary module are fully qualified** — `@Service("com.largata.diary.DiaryService")`, `@RestController("com.largata.diary.web.DiaryController")` — because the frozen old world already owns the default simple-name beans (`diaryService`, `diaryController`) and Spring refuses the collision at startup. Deliberate, not decoration (P9): the qualifiers drop to defaults for free when the rewire deletes the old classes. Do not "simplify" them earlier.
- **Analytics** (ids only, AFTER_COMMIT): `trip_destroyed` · `itinerary_object_published` / `_retired` / `_destroyed` · `diary_created` / `_retitled` / `_deleted` · `postcard_created` / `_recaptioned` / `_deleted`.
