# S3.4 — Photo Dump: the trip's shared photo pool

**Status:** specced — awaiting owner review *(flips to ready-for-agent at the owner's pass — the S4.19/S4.20 precedent)* · **Epic:** E3 · **Depends on:** S3.3 (shipped — the photo pipeline, ingest and audience serving this story extends), S4.17 (shipped — the workspace tab row whose greyed Photo Dump tab goes live)

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** ADR-021 (store, backend-URL serving, INV-11 ingest, two variants, upload+attach as one act — all inherited unchanged) · ADR-024 (the diary re-model this story was grilled alongside; the dump is the diary composer's second photo source) · Artifact 03 (the guard; every endpoint takes the resolved Membership) · INV-1 (the pool is workspace-walled) · ADR-008 (all wire changes additive, no waiver) · the 08/11 diary mock set (design baseline for the dump *as a composer source*; **the dump tab itself has no frame** — designed from the app's theme, a named deviation awaiting the founder's next mock pass).

## The pull, on the record

Grilled 2026-08-11, in the diary session (grill-with-docs, four rounds) — the founder's mock showed the dump as a working photo source inside the Add to Diary composer, while the shipped tab is greyed and nothing anywhere can put a photo into it. Founder ruling: include it now — *"it's just a photo dump."* One association dissolves on the record: S4.17's greyed tab carried ADR-021's **Gallery** (a derived projection of activity photos) as its eventual content; the founder ruled the tab is **uploads only** — the Gallery keeps its derived-projection meaning for published surfaces and leaves the workspace tab entirely.

## Goal

Every member of a trip can throw photos into a shared, member-only pool on the workspace's Photo Dump tab, see everyone's, and take their own out. The diary composer (S3.1) reads from it.

## Locked decisions *(founder, 2026-08-11, in grilling order)*

### 1 · Uploads only — the Gallery association retires from the tab

The dump is a member-uploaded pool, nothing derived: activity photos and the cover never appear in it. **Gallery** (glossary) keeps its meaning — the *published* Overview's derived grid — and its story stays where it was; the workspace tab is the dump and only the dump.

### 2 · Any member uploads; uploader deletes their own; the owner deletes any

The same authority shape membership acts use everywhere. Deletion is a real delete — row and both stored variants (the S3.3 one-blob-one-row rule: a dangling blob is a leak).

### 3 · The pool is workspace-walled (INV-1) and never public

Dump media serves through the existing media endpoint under a new audience: members of the trip, everyone else masked to not-found. No published surface, no consumer surface, no Highlights exposure — ever, in this story.

### 4 · Photos only

Video stays parked at register #14 (S3.3 decision 3, inherited unchanged).

### 5 · Dump writes are workspace acts, not plan writes

ADR-021's "media writes are plan writes" regime binds media *attached to the plan* (cover, activity photos). The dump hangs off the workspace, so: **no Editing Session or lease required, no `planVersion` bump, no activity-history entry, and the publish freeze does not apply** — members keep dumping photos into a published trip (the freeze's ground is the plan; the mock's own capture flow runs mid-trip). The **archive fence does apply**: an archived trip refuses dump uploads and deletions like every other act on the trip; the pool stays readable to the owner under the audience ladder.

### 6 · No capacity cap ships — capacity is the candidate capability

Per-file limits inherit S3.3 (10 MB, image-proven at ingest). No per-trip count cap ships; see the candidate-capability note.

## Mechanics *(the decisions' consequences, settled at the grilling)*

- The existing polymorphic photo storage takes a new subject kind for dump photos, keyed by the itinerary — **no schema migration**: the S3.3 table was built discriminated for exactly this. Upload order is id order (UUIDv7), the property every photo read already uses.
- Ingest is S3.3's unchanged: strip-and-re-encode (INV-11), as-uploaded framing (never square-cropped), two variants, original discarded.
- A new per-kind audience implementation gates reads to trip membership through the guard's resolver — the same masked-404 semantics every workspace read has.
- Deletion authority is enforced in the service on the resolved Membership: uploader-or-owner; a member deleting another member's photo gets a named refusal.
- Upload/delete/list all resolve Membership through the guard first — a non-member sees not-found on every one of them, list included.

## Wire changes *(all additive — no ADR-008 waiver needed)*

- **Upload**: multipart to a new dump collection under the itinerary — one photo per request (the S3.3 idiom), responding with the photo's id, backend media URLs (display + thumb), uploader id, and creation time.
- **List**: the dump collection, cursor-paginated in the standard S0.3 shape, upload order.
- **Delete**: by photo id under the same collection; named refusal code when a member targets another's photo.
- Media serving (`/v1/media/{id}`, `/thumb`) is unchanged — the new kind slots behind the existing endpoint.

## Candidate-capability note *(ADR-009)*

**Photo-dump capacity** — per-trip upload volume: a capability act, footprint-growing, not governance → register #14. (Per-entry media richness is S3.1's note; video is already parked.)

## Deviations from the mock

The 08/11 set draws the dump only as a source grid inside the Add to Diary composer. **The dump tab's own screen has no frame** — it ships designed from the app's theme tokens (ADR-016) and existing patterns (thumb grid per the media components, upload tile per the picker patterns, confirm-before-delete per the standing dialog fork): a named deviation awaiting the founder's next mock pass, the S4.17 ongoing/completed precedent.

## Acceptance criteria

1. A member uploads a photo from the tab; it appears in the grid for every member, on web preview and emulator both, served through bearer-authenticated media requests (the S3.3 ANON-GET tell watched in the driver).
2. A non-member gets not-found on list, upload, and delete — the guard-masking IT family, re-asserted on every new endpoint.
3. The uploader deletes their own photo; the owner deletes anyone's; a member deleting another member's photo gets the named refusal (IT).
4. Deletion removes the row and both stored variants (the existing S3.3 deletion assertions, extended to the new kind).
5. Ingested dump photos carry no embedded metadata (INV-11 IT family) and serve in two variants to members only — a non-member's media GET for a dump photo 404s (IT: the discriminating audience check).
6. An archived trip refuses upload and delete (fence family IT); the owner can still view the pool. A **published** trip accepts uploads (freeze-is-the-plan IT — the check that would have caught the wrong scoping).
7. The tab is live: no `comingSoon`, grid + upload + empty state render on both rungs; register-#2 analytics events emit for upload and delete.
8. Every list read pages in the standard cursor shape.

## Testing decisions *(the seams — highest existing ones, none new; confirm at owner review)*

Backend: HTTP-seam ITs on `PostgresTestBase` + `RestTestClient`, mirroring the S3.3 activity-photo upload family (multipart round-trip, ingest assertions, deletion removing bytes) and the members-list guard family (masking on every endpoint); the media-audience IT is the load-bearing one — member reads vs non-member 404 on the *media* endpoint, not just the collection. Mobile: pure-module tests for grid/anatomy mapping; component tests per the existing media components' families. Walks: `drive-preview.js --upload` for the true multipart path on web; an emulator walk for the native picker path. The four standing rungs; no new seams.

## Out of scope

Video · any consumer/published surface for dump photos · the Gallery derived projection (unchanged, still unbuilt, published-side) · the diary composer's dump section (S3.1 — it consumes this story's list) · capacity caps or any entitlement code (ADR-009) · the day-execution workspace chrome (backlogged at this grilling).

## Comments

**2026-08-11, founder, on the running build — tapping a photo previews it; it does not delete it.** The tab shipped its first pass with delete as the tile's primary tap (the `ActivityPhotoStrip` idiom, where tap-to-remove is defensible because the strip is an editor control inside a form the traveler is already editing). In a *browsing* grid it is the wrong shape: the most natural gesture on a photo is "look at it closer", and that gesture was wired to destruction — guarded by a confirm, but a confirm is a mitigation for a mis-tap, not a licence to put delete on the primary tap.

Tapping a tile now opens `PhotoDumpPreview` — the display variant through the authenticated media path, on the `TravelerDialog` pattern (Modal + scrim + retained-while-closing content, so the photo does not blank out during the dismiss animation). Delete moves inside the preview as a secondary action, offered only when `photoDumpTiles` says the viewer may delete that photo; Close is the primary. The confirm stays, so destruction is now two deliberate taps behind a look.

The authority model is unchanged — this is presentation only, no wire change, no backend change. What did change and is worth keeping: **every tile is now openable, including ones the viewer cannot delete**, where before a non-deletable tile was a dead `Pressable`. A member can finally look at the owner's photos at full size, which the grid always implied and never allowed.

Verified on both rungs: web `drive-photo-dump.js` **21/21** (two new checks — the tap opens a preview, and the pool is unchanged by opening one), emulator by hand (preview renders, Close leaves all 4 photos in the pool).
