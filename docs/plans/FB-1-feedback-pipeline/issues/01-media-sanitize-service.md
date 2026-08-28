# 01 — The media module learns to hand out sanitized display bytes

**What to build:** a prefactor. The media module's public surface gains one service method —
sanitize-for-display: uploaded image bytes in, the display variant out (long edge capped at
2048px, EXIF gone via the JPEG re-encode, never upscaled, the existing size/pixel refusals) —
so a sibling module can obtain contract-grade screenshot bytes across the module boundary
without touching ingest internals (ADR-002), without a Photo entity, and without an
object-store write. This makes ticket 03's change easy.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] A sibling module can obtain a sanitized display JPEG from arbitrary uploaded bytes through the media module's public service surface only
- [x] ITs prove the contract properties: long edge ≤ 2048px, JPEG output, EXIF metadata gone with orientation baked in, small images never upscaled
- [x] Oversized (>10MB) and over-pixel inputs are refused with the ingest's existing named errors
- [x] Every existing photo flow is untouched — the media suite stays green
