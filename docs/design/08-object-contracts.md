# 08 · Object Contracts — the four-object wire reference  `[PRODUCTION DEPTH]`

*Minted at CM-1 ticket 08 (2026-08-30). This is the single reference the rewire story and every later UI story wire against. The new world's endpoints below are **live but dark**: they ship in the backend, fully tested at the API seam, and nothing in the product calls them until the rewire cuts the client over. ADR-034 records the decisions; `docs/plans/CM-1-content-module/spec.md` records the story.*

---

## The four objects

The Trip Tree, as the founder ruled it across the CM-1 grilling:

| Object | What it is | Module | Table | Authority over it |
|---|---|---|---|---|
| **Trip** | The journey-object and its workspace world: plan, chat, polls, dump, members. Dies whole when the owner destroys it. | `com.largata.trip` | the **existing** `itinerary` record — no new table, ever (B-fork rule 4: trip data never forks) | Membership, through the guard; destruction is the owner's alone |
| **Itinerary** | The published page: a real object **minted from the frozen plan at publish**, with an identity that survives publish cycles and the trip's destruction. | `com.largata.publication` *(working name — `com.largata.itinerary` is the frozen old world; the rename is a free refactor after the rewire deletes it)* | `itinerary_object` | The recorded owner (snapshotted at mint) |
| **Diary** | An album of postcards: a stored entity with a title, standalone or auto-minted for a trip. Deleting it deletes its postcards. | `com.largata.diary` | `diary` | Authorship |
| **Postcard** | The atom: 1–5 photos + caption + optional place. Trip-derived (activity snapshot, one per activity per author) or standalone (unlimited). Lives in at most one diary, or loose. | `com.largata.postcard` | `postcard` | Authorship — the only authority over content, including delete across the archive freeze |

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

**Irreversible.** No undo, no bin (the 30-day bin is its own parked story). **What survives, by structure:** the minted itinerary object, every member's diaries and postcards, the old world's diary entries (V47 dropped the cascade), forked copies and their `fork_relationship` rows. Dark rule 3: no UI calls destruction until the rewire — before the readers move, the old feed would mis-hide a destroyed trip's surviving old-world postcards.

### Itinerary object — publish acts on `/v1/trips`, the object at `/v1/publications`

| Act | Endpoint | Authority | Answer | Refusals |
|---|---|---|---|---|
| Publish = mint | `POST /v1/trips/{tripId}/publish` body `{audience?: "public"\|"private"}` (default public) | owner; trip must be `completed` | `200` with the object: `{id, tripId, audience, publishedAt, plan}` — `plan` is the frozen document (header facts + days + activities, textual). Also flips the **same trip record** the old world reads (`published`, `visibility`, `published_at`) — one truth, never forked. First publish mints; republish **refreshes the same object** — the id never changes across cycles (`UNIQUE(trip_id)` makes this structural). | member: `403 NOT_PERMITTED` · stranger: `404 TRIP_NOT_FOUND` · not completed: `409 ITINERARY_NOT_COMPLETE` · bad audience: `400 UNKNOWN_AUDIENCE` |
| Unpublish = retire | `POST /v1/trips/{tripId}/unpublish` | owner | `204`. The object retires (reads mask) **but keeps its id** — every link ever shared resurrects on republish. The trip record flips back. | member: `403 NOT_PERMITTED` · stranger: `404 TRIP_NOT_FOUND` · nothing live to retire: `404 PUBLICATION_NOT_FOUND` |
| Read the page | `GET /v1/publications/{objectId}` | any signed-in traveler (interim public-at-posting posture; profile visibility is the parked story that changes this) | `200` `{id, tripId, audience, publishedAt, plan}` | retired or absent: `404 PUBLICATION_NOT_FOUND` |
| Hard delete | `DELETE /v1/publications/{objectId}` | the **recorded owner** — works when the creator trip no longer resolves (the orphaned page is never unwithdrawable) | `204`, permanent. If the creator trip still exists, its `published` flag clears too (the new world's invariant: published ⇒ object exists). | non-owner: `404 PUBLICATION_NOT_FOUND` (masked) · repeat: `404` |

**Snapshot honesty:** the plan document is textual — titles, labels, times, places, costs, tips, booking facts. It carries the trip's `coverImageUrl` string, but the cover *photo* is workspace media and dies with the trip; whether the published page copies media into its own custody is a rewire-story question, recorded here so nobody reads the dangling URL as a bug.

### Diary — `/v1/diaries`

| Act | Endpoint | Authority | Answer | Refusals |
|---|---|---|---|---|
| Create (standalone) | `POST /v1/diaries` body `{title}` | any traveler; many diaries each | `201` `{id, tripId: null, title, createdAt, updatedAt}` | blank title: `400 DIARY_NEEDS_A_TITLE` · >120 chars: `400 DIARY_TITLE_TOO_LONG` |
| List mine | `GET /v1/diaries?cursor&limit` | author (own list only) | standard cursor page of diaries | — |
| Read one | `GET /v1/diaries/{diaryId}` | any signed-in traveler (interim public-at-posting) | `200` | absent: `404 DIARY_NOT_FOUND` |
| Retitle | `PATCH /v1/diaries/{diaryId}` body `{title}` | author | `200` | non-author: `404 DIARY_NOT_FOUND` (masked) |
| **Delete** | `DELETE /v1/diaries/{diaryId}` | author | `204`. **The diary and every postcard inside it are destroyed in one transaction** — photo rows and stored objects included (founder-ruled containment). Loose postcards and other diaries stand. | non-author: `404 DIARY_NOT_FOUND` (masked) · repeat: `404` |

The trip diary auto-mints (below); deleting it is allowed, and the next add-to-diary re-mints a fresh one. One trip diary per traveler per trip is a partial unique index, race-safe.

### Postcard — `/v1/postcards`, trip-derived creation under `/v1/trips`

| Act | Endpoint | Authority | Answer | Refusals |
|---|---|---|---|---|
| Create (standalone) | `POST /v1/postcards` — multipart: `postcard` JSON `{caption?, place?, diaryId?}` + `photos` (1–5 files) | any traveler; into one of **their own** diaries or loose | `201` `{id, diaryId?, tripId: null, activityId: null, place?, caption?, photos[], createdAt, updatedAt}` | no photo: `400 POSTCARD_NEEDS_A_PHOTO` · >5: `400 TOO_MANY_POSTCARD_PHOTOS` · caption >2000: `400 POSTCARD_CAPTION_TOO_LONG` · someone else's diary: `404 DIARY_NOT_FOUND` (masked) |
| Create (trip-derived) | `POST /v1/trips/{tripId}/activities/{activityId}/postcards` — same multipart, minus `diaryId`/`place` | trip member; trip started; activity of this trip | `201` — the activity's facts are **read through the trip module's interface at post time and snapshotted** (`activityTitle`, `dayLabel`, `timeOfDay`, `place`); the author's **trip diary auto-mints** on first post and is reused after | stranger: `404 TRIP_NOT_FOUND` · archived trip: owner `409 TRIP_ARCHIVED`, member masked `404 TRIP_NOT_FOUND` (the house archive posture) · not started: `400 TRIP_NOT_STARTED` · foreign/absent activity: `404 ACTIVITY_NOT_FOUND` · same activity again: `409 ACTIVITY_ALREADY_POSTCARDED` (another member posts the same activity freely) |
| Read | `GET /v1/postcards/{postcardId}` | any signed-in traveler (interim public-at-posting) | `200`; **reads tolerate a dangling `activityId`** — the snapshot is what renders, the id is only the trail back | absent: `404 POSTCARD_NOT_FOUND` |
| Recaption | `PATCH /v1/postcards/{postcardId}` body `{caption}` | author; **respects the archive freeze** (editing is not withdrawal) | `200` | non-author: `404 POSTCARD_NOT_FOUND` (masked) · trip archived: `409 TRIP_ARCHIVED` (named — the caller provably owns the postcard, so there is nothing left to mask) |
| **Delete** | `DELETE /v1/postcards/{postcardId}` | author, **always** — withdrawal of one's own public content is a right: it crosses the archive freeze and consults no trip state, so a member who left (or was removed from) the trip still deletes by this address | `204`, permanent; photo rows and stored objects destroyed | non-author: `404 POSTCARD_NOT_FOUND` (masked) · repeat: `404` |

Postcard photos serve through the standard media seam (`GET /v1/media/{photoId}` / `/thumb`) under the postcard module's own audience: any signed-in traveler (interim posture, same as reads).

### Error vocabulary minted at CM-1

`TRIP_NOT_FOUND` · `PUBLICATION_NOT_FOUND` · `ITINERARY_NOT_COMPLETE` *(spelling shared with the old world's publish gate)* · `UNKNOWN_AUDIENCE` *(shared)* · `TRIP_ARCHIVED` *(shared, from common)* · `TRIP_NOT_STARTED` *(shared spelling)* · `ACTIVITY_NOT_FOUND` *(shared spelling)* · `DIARY_NOT_FOUND` · `DIARY_NEEDS_A_TITLE` · `DIARY_TITLE_TOO_LONG` · `POSTCARD_NOT_FOUND` · `POSTCARD_NEEDS_A_PHOTO` · `TOO_MANY_POSTCARD_PHOTOS` · `POSTCARD_CAPTION_TOO_LONG` · `ACTIVITY_ALREADY_POSTCARDED` · `NOT_PERMITTED` *(shared)*.

## The existing wire, in Trip Tree vocabulary

The strangler's other half: what the shipped app talks to today, read with the four-object vocabulary. Nothing here moved at CM-1 — not one path, spelling, or semantic (ADR-008; the existing suites pass byte-identical).

| Surface | Endpoints | Vocabulary reading |
|---|---|---|
| **The Trip** (record + lifecycle) | `POST/GET /v1/itineraries` · `GET/PATCH /v1/itineraries/{id}` · `POST …/{id}/start` `…/complete` `…/reopen` `…/archive` `…/unarchive` · `POST …/{id}/finish-planning` *(dormant, permanently refusing)* | The trip's own facts and ladder. `viewerRole`/`memberCount` additive since S4.38. |
| **The Plan** | `POST /v1/itineraries/{id}/days` · `PATCH/DELETE …/days/{dayId}` · `POST/PATCH/DELETE …/days/{dayId}/activities[/{activityId}]` · `POST …/activities/{activityId}/move` · `PUT …/activities/order` · `PUT …/{id}/plan` · `POST/DELETE …/{id}/edit-lock[, /renew]` | The itinerary document a Trip carries, edited under the Editing Session (ADR-023/027). |
| **Publishing (old flow)** | `POST /v1/itineraries/{id}/publish` `…/unpublish` · `GET /v1/itineraries/{id}/preview` · `GET /v1/published-itineraries/{id}` · `POST /v1/itineraries/{id}/fork` | The projection-based published page (ADR-017/019). Runs unchanged through the dark window; the cutover backfill mints objects for currently-published trips, and the rewire decides these endpoints' fate. |
| **Old-world postcards** (Diary Entries) | `POST/GET /v1/itineraries/{id}/diary/entries[/{entryId}]` · `PATCH/DELETE …/entries/{entryId}` · photo add/remove/from-dump · `GET /v1/me/diary/trips` | The trip-rooted postcard shape (ADR-024). **V47 changed its schema only**: destroying a trip no longer cascades these rows away, and deleting a plan activity leaves `activityId` dangling instead of nulling it — reads render from the snapshot either way. The cutover backfill translates these rows into `postcard`/`diary` rows. |
| **Workspace world** | members/invitations (`/v1/itineraries/{id}/invitations[…]`, `/v1/invitations/{id}/accept|decline|revoke`, `DELETE …/members/{travelerId}`) · ownership offers · polls · chat · photo dump · join links (`/v1/itineraries/{id}/join-link`, `/v1/join/{token}[…]`, join requests) | Everything membership-authorized. All of it is what `DELETE /v1/trips/{id}` destroys. |
| **Feed / discovery / profiles** | `/v1/feed/postcards[…]` · `/v1/discovery/*` · `/v1/travelers/{handle}[…]` · `/v1/me/profile/*` · follow | Readers over the old world's rows. They move at the rewire; until then anything written only into the new tables is invisible to them — which is exactly why the new world ships dark (B-fork rule 1). |
| **Identity / media / infra** | `/v1/me[…]` · `/v1/handles/*` · `/v1/verification-codes[…]` · `/v1/media/{photoId}[…]` · `/v1/ws-ticket` · `/v1/health` · `/v1/reports` | Keeper modules (identity, media, common, verification, report, ws). The new world may import identity and media; the boundary guard forbids everything else. |

## Postures recorded, not invented

- **Read audience is interim public-at-posting** for publications, diaries, and postcards — any signed-in traveler reads. The profile-visibility story (parked, epic map) is where this changes; it cascades from the profile when it lands.
- **Freshness:** nothing here is traveler-visible until the rewire, so every surface's lane note is owed by the rewire story, not this doc.
- **Events: none.** Archive state and activity facts are synchronous interface reads; `TripDeleted` and destruction-time WS eviction arrive with the rewire, when the endpoint gains live callers.
- **The one keeper-module change:** `PhotoSubject` gained the additive `POSTCARD` constant (media is a keeper, not old world; the constant is unreachable through every existing flow).
- **Analytics** (ids only, AFTER_COMMIT): `trip_destroyed` · `itinerary_object_published` / `_retired` / `_destroyed` · `diary_created` / `_retitled` / `_deleted` · `postcard_created` / `_recaptioned` / `_deleted`.
