# 02 · Trip cards — mock anatomy, cover thumbnails, publication badges

Status: needs-triage

Spec decisions 4 (badges half) and 5. Backend untouched — `coverImageUrl` is already on `ItineraryResponse`; the S3.3 thumbnail variant is already minted at ingest.

## Scope

- `TripRow` takes the mock's card anatomy: 76×76 thumbnail (radius 12) · date above title (500 · 11/14 · muted token) · title (700 · 15/20) · the existing status slot (lease advisory dot + "Currently being edited"; Draft subtitle "Continue editing your Trip Workspace") — card container per mock (white, 1px hairline border, radius 16, the mock's soft shadow, padding 12, row gap 12).
- The **destinations line drops** (stated in the spec's deviation table — the mock has none).
- Thumbnail source: **`useMediaSource` on the thumbnail variant** — never a bare `<Image>` remote URL (the S3.3 `ANON GET` trap). Coverless trips render a neutral placeholder tile, same geometry.
- **Publication badges** (discharged backlog line): published trips carry a badge on the card distinguishing `public` / `private`; unpublished cards carry none. Placement in the mock's `badge-and-meta` slot beside the status text.
- Card-tap routing **unchanged** this story (spec decision 3's consequence (c) — re-points at the workspace-redesign story).

## Acceptance

- AC 5 (remainder), 6 of the spec.
- Unit: badge selection logic (published+public, published+private, unpublished) · placeholder branch.
- Emulator + web preview: a trip with an uploaded cover shows its thumbnail on the landing (the driver's request list shows `bearer`, no `ANON GET /v1/media/…`); a coverless trip shows the placeholder; backend log shows no `UNAUTHENTICATED` rejection for media GETs.

## Comments
