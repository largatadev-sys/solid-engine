# 02 — Avatar end-to-end: the ingest pipeline, media serving, and the first upload surface

**What to build:** the tracer bullet — a traveler picks a photo on their profile, it uploads, and their face appears everywhere they're named. The simplest authority (self), the simplest audience (any traveler), no leases, no fences — which is why the pipeline's heart lands here: ingest, the photo table, and the media read endpoint (spec decisions 1, 5, 8, 9, 10; ADR-021; INV-11).

**Blocked by:** 01 — the storage rig.

**Status:** done *(the emulator walk belongs to ticket 05)*

- [x] The `photo` metadata table lands additively: uploader (attribution, never authority), attachment discriminator + id, storage key, content type, dimensions, byte size, created-at.
- [x] Ingest: multipart upload → bytes proven an image → EXIF/GPS/XMP stripped and orientation normalized (INV-11) → display (≤2048px long edge) + thumb (≤400px) variants stored, the original discarded — unit-tested on crafted fixtures: a GPS-tagged JPEG, a rotated JPEG, non-image bytes wearing an image content type. Both stored variants carry zero embedded metadata, asserted at the byte level.
- [x] Refusals in the standard envelope, each named: non-image → 400; a file over 10 MB → refused.
- [x] `GET /v1/media/{id}` and `/thumb` serve image bytes; avatar audience = any authenticated traveler; no token → 401. Stored URLs are backend URLs — never a provider hostname.
- [x] `POST /v1/me/avatar` uploads + attaches in one act; replace overwrites and deletes the old blob synchronously (one blob, one row — never shared); `DELETE /v1/me/avatar` clears to NULL and the initials fallback resumes.
- [x] Mobile: the picker dependency named and justified per P9 (`expo-image-picker` — Expo-standard, web-capable; config-plugin scale, so a prebuild + dev-build rebuild — the JDK-21 gotcha applies to the Gradle run); pick-and-upload lives in the repository layer (no raw fetch, ADR-001); the picker mock enforces the **native** contract, not the TypeScript signature (the S0.2 lesson).
- [x] The profile step gains the camera badge + Upload Photo — appearing additively, exactly as S4.0 decision 8 promised; the uploaded photo renders through `Avatar`, and the initials-only surfaces that already receive `avatarUrl` on the wire (`AvatarStack`, the published byline) upgrade to photo-with-initials-fallback. *(The `AvatarStack`/byline half moves to ticket 05 with the other surface sweeps — see comment 5.)*
- [ ] The web preview runs the same flow through a file input; the preview driver gains CDP file-chooser interception and asserts the rendered image resolves against the running backend — "renders on web" is not "works on web". *(Ticket 05.)*
- [x] Backend + mobile suites green; `tsc` clean.

## Comments

**1 · The upscale bug the first test caught.** Thumbnailator's `size()` fills the requested box in both directions, so asking for 2048 from a 200px avatar returns a *stretched* 2048px image — blurrier than the original and an order of magnitude more bytes to serve. `anImageSmallerThanTheVariantIsNotUpscaled` failed on the first run and the variant target is now capped at the source's own longest edge.

**2 · INV-11 is sabotage-verified, twice, at two layers.** `ExifStrippingTest` builds a JPEG carrying a real APP1/`Exif\0\0` segment with a `LARGATA-HOME-COORDS` sentinel, asserts *the fixture actually carries it* (so the test cannot pass vacuously), then asserts both variants are clean. Sabotaged by passing the uploaded bytes through as the display variant: both assertions failed. `smoke-media.js` repeats the check on the bytes **the running server hands out**, which is the layer that ships.

**3 · The smoke found a vacuous assertion of its own — the exact trap CLAUDE.md keeps cataloguing.** The first version compared thumbnail and display byte lengths using an 8×8 fixture, which is smaller than *both* caps, so `Math.min` made them the same image and `thumb <= display` passed at 631 = 631 bytes. It would have passed just as happily with resizing entirely broken. Replaced with a 1200×900 fixture (thumb 4068 vs display 25491) — and fixing it immediately surfaced a real sequencing error in the script, where a later upload had already retired the photo a subsequent check was reading.

**4 · The layering guard rejected the web upload path, correctly.** `photoPart.web.ts` first read the picked file back through `fetch(blob:…)`, which `layering.test.ts` refuses (ADR-001: the repository layer is the only path to the network). `XMLHttpRequest` is refused by the same rule. The fix is better than either: the web picker already holds the `File`, so it carries it forward on `PickedPhoto.bytes` and the part is built with **no network call at all**.

**5 · Deliberately deferred to ticket 05.** `AvatarStack` and the published byline still render initials only — they take `avatarUrl` on the wire already, so lighting them up is a one-line change per surface, but it is a *surface sweep* and belongs with the other sweeps rather than half-done here. The web-preview driver and the emulator walk likewise.

**6 · Verification.** Backend **136 unit** + `AvatarContractIT` **8/8** + `PhotoStorageIT` (the enum-spelling pin: V23's partial index names `TRAVELER_AVATAR`/`ITINERARY_COVER`, the S1.1 trap) + `S3ObjectStoreIT` **4/4**, all against real containers. Mobile **1707 tests / 53 suites**, `tsc` clean. Against the running stack: `smoke-media.js` **14/14**, and afterwards the bucket held **0 objects** against **0 photo rows** — the blob cleanup leaves nothing orphaned.
