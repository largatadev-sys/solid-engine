# 03 — Screenshots ride the report

**What to build:** up to three screenshot parts accepted on the same POST, sanitized through
the media module's new service (ticket 01), and stored ordinally as bytes on the report's
outbox rows — inside the existing 12MB request envelope, which stays unchanged (spec
decision 7).

**Blocked by:** 01 (the sanitize service), 02 (the accept endpoint).

**Status:** done

- [x] 1–3 JPEG/PNG parts are sanitized (≤2048px JPEG) and stored in order; the stored bytes differ from the originals when the original was oversized or carried EXIF
- [x] More than 3 parts, or a non-image part → `400`, nothing persisted — the report JSON included
- [x] A single image over the ingest's 10MB cap is refused with the named domain error; a request beyond the container cap answers `413`
- [x] A replay of an already-accepted `reportId` stores no second copy of any screenshot
