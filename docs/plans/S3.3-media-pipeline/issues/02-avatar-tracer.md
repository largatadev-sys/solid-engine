# 02 — Avatar end-to-end: the ingest pipeline, media serving, and the first upload surface

**What to build:** the tracer bullet — a traveler picks a photo on their profile, it uploads, and their face appears everywhere they're named. The simplest authority (self), the simplest audience (any traveler), no leases, no fences — which is why the pipeline's heart lands here: ingest, the photo table, and the media read endpoint (spec decisions 1, 5, 8, 9, 10; ADR-021; INV-11).

**Blocked by:** 01 — the storage rig.

**Status:** ready-for-agent

- [ ] The `photo` metadata table lands additively: uploader (attribution, never authority), attachment discriminator + id, storage key, content type, dimensions, byte size, created-at.
- [ ] Ingest: multipart upload → bytes proven an image → EXIF/GPS/XMP stripped and orientation normalized (INV-11) → display (≤2048px long edge) + thumb (≤400px) variants stored, the original discarded — unit-tested on crafted fixtures: a GPS-tagged JPEG, a rotated JPEG, non-image bytes wearing an image content type. Both stored variants carry zero embedded metadata, asserted at the byte level.
- [ ] Refusals in the standard envelope, each named: non-image → 400; a file over 10 MB → refused.
- [ ] `GET /v1/media/{id}` and `/thumb` serve image bytes; avatar audience = any authenticated traveler; no token → 401. Stored URLs are backend URLs — never a provider hostname.
- [ ] `POST /v1/me/avatar` uploads + attaches in one act; replace overwrites and deletes the old blob synchronously (one blob, one row — never shared); `DELETE /v1/me/avatar` clears to NULL and the initials fallback resumes.
- [ ] Mobile: the picker dependency named and justified per P9 (`expo-image-picker` — Expo-standard, web-capable; config-plugin scale, so a prebuild + dev-build rebuild — the JDK-21 gotcha applies to the Gradle run); pick-and-upload lives in the repository layer (no raw fetch, ADR-001); the picker mock enforces the **native** contract, not the TypeScript signature (the S0.2 lesson).
- [ ] The profile step gains the camera badge + Upload Photo — appearing additively, exactly as S4.0 decision 8 promised; the uploaded photo renders through `Avatar`, and the initials-only surfaces that already receive `avatarUrl` on the wire (`AvatarStack`, the published byline) upgrade to photo-with-initials-fallback.
- [ ] The web preview runs the same flow through a file input; the preview driver gains CDP file-chooser interception and asserts the rendered image resolves against the running backend — "renders on web" is not "works on web".
- [ ] Backend + mobile suites green; `tsc` clean.

## Comments
