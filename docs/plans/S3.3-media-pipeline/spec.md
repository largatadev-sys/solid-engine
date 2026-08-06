# S3.3 — Media pipeline: photos across the four promised surfaces

**Status:** grilled · pending owner review (spec + tickets) · **Epic:** E4 pull (resliced from E3, 2026-07-29) · **Depends on:** S4.0, S4.1, S4.13 (all shipped)

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** **ADR-021** (store · serving · ingest — recorded at this grilling) · ADR-002 (S3-class storage, bytes never in Postgres — the day-one decision this story finally wires) · ADR-008 (the cover/avatar wire fields are URL strings shipped writer-less *exactly so this story is an activation, not a shape change*) · ADR-009 (candidate-capability note below — this story mints the first two **pre-decided** premium capabilities) · ADR-014 as amended (subject-typed leases guard media writes) · ADR-018/019 (the publish freeze covers media) · S1.9 (the archive fence) · S4.1 (the audience ladder; its cover-slot discrepancy closed at decision 13) · INV-6 as amended (media never forks) · **INV-11** (strip at ingest — new at this grilling).

## The pull, on the record

Four recorded promises accumulated against S3.3: the avatar upload affordance (S4.0 decision 8), the cover field shipped API-shape-only (S4.9 → S4.1), per-activity photos and the gallery (S1.3 → S4.13, all greyed). Grilled 2026-08-06 (grill-with-docs). Fact-finding before round 1: the code's media surface (cover = `cover_image_url TEXT`, writer-less, pinned by `PublishMetadataIT`; zero storage deps in the pom; no image library in the mobile tree; MinIO healthchecked in compose with no bucket and no volume) and the storage-provider landscape (Railway launched native Buckets Sept 2025, price-matching R2, region list unpublished; B2 has no APAC region; MinIO community edition is EOL'd — Railway's own templates steer to Garage; `largata.com` DNS is already on Cloudflare).

## Goal

A traveler puts photos on the product's four promised surfaces — their avatar, a trip's cover, an activity's photos, and the gallery those compose into — through one pipeline: multipart upload through the backend, strip-and-re-encode at ingest, an S3-class store reached only through backend URLs that enforce the audience ladder.

## Locked decisions *(founder, 2026-08-06, in grilling order)*

### 1 · All four surfaces activate

Avatar (profile edit step gains the camera badge + Upload Photo, per S4.0's "absent, not disabled" promise) · itinerary cover (create flow drop-zone + edit screen) · per-activity photos (activity form) · the gallery (preview + published Overview). Every greyed media tile either activates or retires — `GreyedMediaTile`'s `coverPhoto`/`activityPhoto` surfaces and the gallery strip's `comingSoon` tap all die here. Activation consequence, in scope: surfaces that already receive `avatarUrl` on the wire but render initials-only (`AvatarStack`, the published byline) upgrade to photo-with-initials-fallback — an uploaded avatar's whole point is being seen where the traveler is named. Diary media stays E3's; the pipeline must not preclude it.

### 2 · The Gallery is a derived projection *(glossary)*

Cover + the plan's activity photos, in plan order. Never an entity — an itinerary-level photo set is deliberately absent, because **Diary is the album concept** and a second album would collide with it. Client-composed from the responses the surfaces already receive; no new wire field. An empty plan renders the empty-gallery treatment.

### 3 · Photos only; video is premium and waits for the seam

Founder ruling verbatim: *"photo only, premium users gets to upload videos but only 5 second videos."* Disposition (a) chosen on the record: the ruling is **captured, not built** — a video pipeline shipped at S3.3 would sit behind a door no user can open for the whole alpha (launch is entirely free; billing is Epic 7), the exact mechanism-before-policy shape parked three times before (S1.8, EDA, deletion). Recorded in the candidate-capability note + the epic-map backlog line. **Mock deviation stated per the fidelity rule:** the S1.3 mock's drop-zone says "Upload photo(s)/video(s)"; ours ships "Upload photo(s)".

### 4 · Media never forks *(INV-6 amended)*

Photos and the cover are excluded from the copy — a fork starts photo-less; Creator Tips still cross (words fork, images do not). Consequence for S4.7's fidelity pass, recorded now: photo-less fork previews are the rule working, not a bug.

### 5 · Strip-all at ingest *(INV-11)*

Server-side re-encode of every upload: EXIF/GPS/XMP gone, orientation normalized, and the bytes proven to actually be an image (closing content-type spoofing in the same motion). Founder's ground: location context already lives on the activity/itinerary as deliberate free text — the tag carries nothing of value. Safety ground: the register #11 family — a cover shot at home broadcasts home coordinates more precisely than absolute dates ever did. Client-side stripping alone would be theater (any client can hit the API — the argument that rejected client-only verification enforcement).

### 6 · Store: Railway Buckets, Asia-conditional; Cloudflare R2 `apac` as the recorded fallback *(ADR-021)*

Per-env buckets beside the per-env Postgres. **The condition is checked at dev-bucket provisioning** — the region dropdown is the only source of truth for Railway's unpublished region list; no Asia region offered → R2 immediately (a recorded fallback, not a new decision). The bet is cheap to lose by construction: S3-compatible SDK + decision 7's no-provider-hostname rule make leaving a config change plus a data copy.

### 7 · Serving: backend URLs through the audience ladder *(ADR-021)*

Stored media URLs are always backend URLs (`/v1/media/{id}`, `/v1/media/{id}/thumb`) — never a provider hostname, never a presigned URL (an expiring URL stored in a TEXT column is a lie). The media endpoint enforces the audience at read time: **avatar** = any authenticated traveler (the byline already crosses the wall, INV-2) · **itinerary media** = the itinerary's audience ladder (private → members · published+public → any traveler · archived → owner only; masked as 404 per the guard's discipline) · no token → 401 (accountless visitors arrive with the web read-only surface, INV-3). Proxy streaming now; the presigned-redirect flip is the recorded optimization — one endpoint change, invisible to every stored URL, when egress cost or latency says so.

### 8 · Upload: multipart through the backend, upload+attach as one act *(ADR-021)*

Surface-specific endpoints (wire changes below), because authority is surface-specific and checked at upload time: header lease for the cover, activity lease for photos, self for the avatar. The INV-11 re-encode sits inline in the write path; caps enforced server-side; Spring multipart config sized to the cap. No bucket CORS, no pending-media state machine, no orphan risk — identical on native and the web preview through the typed apiClient (ADR-001's no-raw-fetch rule holds; the repository layer owns the multipart call).

### 9 · Two variants at ingest; the original is discarded

Display (≤2048px long edge) + thumbnail (≤400px), minted in the ingest re-encode. The original has no reader, is the largest blob, and is the only copy that ever contained EXIF — keeping it would re-create the liability the strip removed. Flip-to-keeping requires a real full-res consumer (print, zoom) appearing.

### 10 · Caps: 5 photos per activity free — the 6th is premium, recorded not built

The founder's ruling makes >5-per-activity the second premium capability. S3.3 ships a **hard cap of 5 for everyone — a constant, not a tier branch** (the no-inline-tier-check rule holds; Epic 7 wires the constant into `can()`). Cover = 1, avatar = 1, replace overwrites. Per-file cap 10 MB pre-encode. All server-enforced, all loosenable additively.

### 11 · Media writes are plan writes *(consequences adopted as rules at the grilling)*

The publish freeze and the archive fence apply: changing a published trip's cover means unpublish → edit → republish, same as a typo (ADR-018's rule). Cover under the **header lease**; activity photo add *and* delete under the **activity lease** (both mutate the activity's content — the cap also makes concurrent adds non-commuting, so "adds are unguarded" does not extend here). Avatar is untouched by every fence. Any lease-holding member manages an activity's photos — plan content is collectively owned (S1.3's authority split); the uploader is recorded as attribution, never authority. Decision 4's no-fork rule means **one blob, one owner row, never shared** — replace/delete removes the blob synchronously; no refcounting, no GC, ever.

### 12 · The local rig: pin the emulator, mint the bucket at compose-up

MinIO community edition is EOL'd. Pin the image (tag/digest) or swap to Garage — implementer's call at the ticket; criteria: S3-compatible, healthcheckable, works with the `testcontainers-minio` module (noted at S0.1 ticket 04 for exactly this day). Compose-up creates the bucket, extending the fresh-stack semantics to storage: fresh DB, fresh bucket, from a clean checkout.

### 13 · The S4.1 cover-slot discrepancy closes here

S4.1 amendment 5 claims the cover slot renders in the shared published header; the shipped `PublishedItineraryView` never reads `coverImageUrl`. The slot gets built now — cover in the shared header, placeholder treatment when null — the doc-vs-code gap closed deliberately rather than silently inherited.

## Wire changes *(all additive — no ADR-008 waiver needed, a first for this story family)*

- `POST /v1/me/avatar` (multipart) → `MeResponse` · `DELETE /v1/me/avatar` → clears to NULL (initials fallback resumes).
- `POST /v1/itineraries/{id}/cover` (multipart; header lease; fences) → `ItineraryResponse` · `DELETE .../cover` clears.
- `POST /v1/activities/{id}/photos` (multipart; activity lease; fences; cap 5) → the photo `{id, url, thumbUrl}` · `DELETE /v1/activities/{id}/photos/{photoId}`.
- `GET /v1/media/{id}` · `GET /v1/media/{id}/thumb` → image bytes (the first binary responses in /v1; non-2xx still answers with the standard envelope).
- `ActivityResponse` + `PublishedActivityResponse` gain `photos: [{id, url, thumbUrl}]` (upload order). `coverImageUrl` gains its first writer — activation, not shape change.
- One additive migration: the `photo` metadata table (uploader, attachment discriminator + id, storage key, content type, dimensions, byte size, created-at).

## Acceptance criteria

1. Avatar: pick → upload → renders on the profile and everywhere `Avatar` renders, `AvatarStack` and the published byline included; replace overwrites; DELETE returns to initials; the old blob is gone from the store.
2. Cover: uploads from the create flow and the edit screen under the header lease; renders on the workspace header, the preview, and the published header (decision 13); the placeholder treatment when null is unchanged.
3. Activity photos: up to 5 upload and render; the 6th is refused with a named error; delete works under the activity lease; order = upload order.
4. Gallery: preview + published Overview compose cover + activity photos in plan order, with the overflow ("+N") treatment; the empty state renders when the plan has no photos.
5. A GPS-tagged photo: both stored variants carry zero EXIF/GPS/XMP (byte-level assertion); a rotated phone photo renders upright.
6. Non-image bytes → 400 named; an 11 MB file → refused named; both in the standard envelope.
7. The ladder on `GET /v1/media/{id}`: private trip photo — member 200, non-member 404; published+public — any traveler 200; archived — owner 200, member 404; no token 401; avatar — any traveler 200.
8. Media writes are refused while published (freeze) and while archived (fence); cover without the header lease and photo add/delete without the activity lease → 409.
9. Every `cover_image_url`/`avatar_url` value written by this story matches the backend-URL form — **no provider hostname anywhere in the database**, pinned by an IT.
10. Exactly two objects per photo in the store; no original survives.
11. `docker compose up` from a clean checkout yields a working bucket (fresh-bucket semantics); the emulator image is pinned (or swapped, recorded); storage ITs run under Testcontainers.
12. Deployed dev: bucket provisioned with the decision-6 conditional executed and its outcome appended to `## Comments`; the post-merge probe uploads and reads on deployed dev, naming the environment and using a discriminating signal (the S1.1 rule — state what failure looks like before trusting it).
13. Suites green, `tsc` clean; three rungs: API smoke (upload/read/ladder), emulator walk (avatar + cover + activity photos + gallery), rebuilt preview container driven via CDP **including a real file upload on web** — "renders on web" is not "works on web".
14. No entitlement code exists anywhere in the diff — greppable: no tier branch, no `can(`, no premium constant. The ADR-009 rule held under the first story that tempted it.

## Testing decisions

- **Backend:** ingest unit tests on crafted fixtures (a GPS-tagged JPEG, a rotated JPEG, non-image bytes wearing an image content type); storage ITs via the `testcontainers-minio` module; the media-read ladder IT through the REST harness (the guard-IT pattern — four token/membership flavors, not one); fence/lease refusals extend the existing tables.
- **Mobile:** the multipart call lives in the repository layer (ADR-001 — no raw fetch; the picker and the upload are mockable at that boundary); the picker mock enforces the **native** contract, not the TypeScript signature (the S0.2 `getTokens()` lesson). New native dependency named per P9: `expo-image-picker` — the Expo-standard, web-capable choice; config-plugin scale, so it costs a prebuild + dev-build rebuild (the JDK-21 gotcha applies to any Gradle run).
- **Preview driver:** drive a real file input via CDP file-chooser interception; assert the rendered `<img>` resolves against the running backend, not just that a screen painted.
- **Which build proves what:** everything here is dev-build provable after the one rebuild; no release-signed behavior changes.

## Candidate-capability note *(ADR-009)*

`media.upload.video` (≤5-second clips) · `media.upload.photo` beyond 5 per activity — both **pre-decided premium** by founder ruling at this grilling: the candidate map's first entries that arrive already ruled, not merely flagged. Both pass the potentially-gated test (footprint-growing, meterable, not governance). Wiring waits for the seam at register #14 / Epic 7; S3.3 itself ships no gate.

## Out of scope

- **Video, any length** — premium, parked (epic-map backlog line; trigger register #14/Epic 7).
- **Photos beyond 5 per activity** — same line.
- **Diary media (E3)** — the pipeline must not preclude it; nothing diary-shaped builds.
- **Photo reorder within an activity** — upload order only; additive later if wanted.
- **An itinerary-level photo set** — refused on the record (decision 2: Diary is the album).
- **Presigned-redirect serving / CDN** — the recorded flip-to and the deferred list (04) respectively.
- **Fork behavior** — S4.7's; INV-6's no-media rule binds it then.
- **Entitlement anything** — ADR-009 stands; see AC 14.

## Comments

*(Append-only. Intent changes during implementation land here, never in the body above.)*
