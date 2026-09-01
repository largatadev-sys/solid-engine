# Handoff: Geotag Location Links

*(Founder-built Claude Design handoff, 2026-09-02, archived verbatim as PL-1's design baseline — one encoding pass applied, no content changes. Where its query-scoping note diverges from the spec, the spec's hint rule is the ruling.)*

## Overview
Free-text location strings across Largata's read surfaces become tappable links that open Google Maps. No form or picker changes — this is read-surface rendering only. Four surfaces: workspace day-card activity rows, the published itinerary's Day-by-Day tab (plus its header destination pill), the feed card (variant C re-chrome), and diary postcards (stream entry, trip-diary/profile card, entry-view snapshot header).

The Details tab is **out of scope** — it was retired in S4.25 and stays retired. If trip details surface in the workspace header facts line, the same destination-link rule applies there (see spec).

## About the Design Files
`Geotag Link States Spec.dc.html` is a **design reference created in HTML** — a spec canvas showing intended look and states, not production code. Recreate the drawn states in the existing React Native codebase (`mobile/`) using its established patterns: token files under `src/theme/`, `.native.ts`/`.web.ts` platform splits, `Pressable` style functions, `Icon` component glyphs.

## Fidelity
**High-fidelity.** Every color, size, and weight below is exact and traceable to shipped token files. Frames were drawn from source reads of `WorkspaceDayCard.tsx`, `PublishedItineraryView.tsx`, `FeedCard.tsx`/`feedTokens.ts`, `Postcard.tsx`, `PostcardStreamEntry.tsx`, and `workspaceTokens.ts`/`tokens.ts`.

## The Vocabulary (one rule everywhere)
- **Rest:** place text tinted `#EA580C` (workspaceColors.accent), weight 600, no underline. Plain-text links get **no glyph**; the only glyph anywhere is the tag chips' existing pin.
- **Pressed:** ink darkens to `#C2410C` (travelerColors.accentDark). Chips additionally swap their well `#FFF0EC → #FFE0D5`. Plain-text links are **ink-only** when pressed — no wash, no scale, no opacity.
- **Ellipsis:** single line, tail-truncated (`numberOfLines={1}`). On split meta lines the clamp lives on the outer `Text` — RN cannot clamp a nested segment alone.
- **New tokens:** add `locationLink: '#EA580C'` and `locationLinkPressed: '#C2410C'` (suggested home: a small block in `workspaceTokens.ts`). Link ink is #EA580C on **every** surface, including the published view whose own accent is #D96C4A — one link color beats per-surface accents; it is already the feed tag ink and diary eyebrow color.
- **No pin glyphs are added to forms.** All surfaces here are read surfaces.

## Maps plumbing (new, no schema change)
Every surface already carries the string: `activity.place`, `card.place` (FeedPostcardResponse), `entry.place` (DiaryEntryResponse), `projection.destination`.
- New util `mapsUrl(place: string)` → `https://www.google.com/maps/search/?api=1&query=<encodeURIComponent(place)>`.
- New `openInMaps.native.ts` / `openInMaps.web.ts` split (the codebase's usual pattern; no `Linking` use exists yet): native `Linking.openURL(url)`, web `window.open(url, '_blank')`.
- **Query scoping (recommended):** workspace and published activity rows append the trip destination — `"Big Lagoon Kayaking, El Nido"` — because bare free text is too ambiguous for Maps. Feed and postcard tags query their own string as-is (they usually already carry context, e.g. "Big Lagoon, El Nido"). *(Superseded by the spec's hint rule: bias wherever destination is known, with a contains-check preventing doubled context.)*

## Screens / Views

### 1 · Workspace day-card activity row
Meta line today: one string from `activityMetaLine(timeOfDay, place)` joined with `" • "`, rendered as a single 12px/15 `#78716C` Text under the 14px/18 semibold `#1C1917` title.

**Change:** the place segment alone becomes the link.
- Rendered shape: `<Text numberOfLines={1}>7:00 AM • <Text onPress>Big Lagoon Kayaking</Text></Text>` — time and separator stay plain `#78716C`; place segment `#EA580C` weight 600, pressed `#C2410C`.
- **Dev cost:** `activityMetaLine()` must return parts `{clock, place}` instead of a joined string (keep a joined fallback for callers that need one). The separator belongs to the outer Text.
- **Clock format:** unify on unpadded `"7:00 AM"` — the diary's `postcardClock` already strips the leading zero; shipped `formatTimeOfDay` pads `"07:00 AM"`. Un-pad while splitting the line.
- **Hit target:** nested Text can't take hitSlop; pressed feedback is ink-only and the target is the text run itself. Do **not** wrap the whole meta line (mis-taps on the time would open Maps).
- Rows with no place render exactly as today (time only, fully muted) — nothing tappable.
- A11y: place segment `accessibilityRole="link"`, label `"<place>, open in Google Maps"`.

### 2 · Published Day-by-Day + header destination
- **Activity place** (`styles.activityPlace` in `PublishedItineraryView.tsx`, today `typography.caption` in `colors.textSecondary`): same 13px/20 type, ink → `#EA580C` weight 600, pressed `#C2410C`, `numberOfLines={1}`. It is already its own Text — no string splitting needed. Query scoped: place + ", " + destination.
- **Destination pill** (header): trades its navy fill (`colors.textPrimary` bg, white overline) for the link vocabulary — well `#FFF0EC`, ink `#EA580C`, overline type unchanged (11px/14 w700 tracking 1.5, uppercase via `destinationPillLabel`). Pressed: well `#FFE0D5`, ink `#C2410C`. ⚠ This **re-colors a shipped element** — a solid-navy tappable pill would read as a filter chip, not a link. Query: the destination string itself.

### 3 · Feed card — variant C (the frame that matters)
Two doors, cleanly split:
- **Trip title line** (`styles.tripLine`, 11px/14 w600) stays the door to the published trip: tinted `feedColors.tripLine #C2410C` + tappable when `publishedItineraryId !== null`. **When not published it goes inert AND untinted `#78716C`** — today it stays tinted even when dead; variant C fixes that so tint = tappable holds card-wide.
- **Location tag** (chip: well `feedColors.tagWell #FFF0EC`, radius 6, pin `Icon name="mapPin"` 12px, label 11px/14 w700, ink `feedColors.tagInk #EA580C`, `numberOfLines={1}`) **stops opening the trip** — delete its `navigates` branch — and **always opens Google Maps**, even on unpublished trips (before, the tag had no destination at all unless published). Pressed: well `#FFE0D5`, ink + pin `#C2410C` (add `tagWellPressed`/`tagInkPressed` to `feedTokens.ts`). No extra glyph — the pin carries the affordance.
- A11y relabel: tag → `"<place>, open in Google Maps"`; title line keeps `"…, open the published trip"`.
- Everything else on the card is unchanged (author row, Trip badge, carousel, caption clamp, engagement row).

### 4 · Postcard (diary stream + trip-diary/profile card + entry view)
`DiaryEntryResponse.place` ships in the payload today but **no postcard surface renders it** — this is new rendering, not new data. Add the feed tag treatment verbatim (well `#FFF0EC`, pin glyph, ink `#EA580C` bold 11, same pressed states, single-line ellipsis, `alignSelf: flex-start`, `maxWidth: 100%`):
- **PostcardStreamEntry:** tag sits between the title and the photo stage.
- **Postcard (trip diary / profile):** tag slots under the title row (title + day-time badge), above the caption. Skip entirely when `place === null` — no layout ghost.
- **DiaryEntryScreen (entry view):** tag renders in the snapshot header under `snapshotEyebrow` + title. Read-only and tappable even mid-edit; it is **not** a form field and gets no form affordance.
- Tag tap opens Maps with the entry's own place string. The tag must not be inside the card's existing `onPress` summary Pressable (postcard tap still opens the entry; tag tap opens Maps — sibling Pressables).

## Interactions & Behavior
- Tap any location link/tag → `openInMaps(mapsUrl(query))`. External navigation; no in-app screen.
- Pressed states via `Pressable` style functions (existing codebase pattern). No animation, no scale, no opacity change — ink (and chip well) color swap only.
- Trip-title door on feed unchanged: `onOpenTrip(card)` when published.
- No loading, error, or empty states — a link is drawn only when the string exists.

## State Management
None. All strings come from existing responses. New pure utils: `mapsUrl`, `openInMaps` (platform split), and the `activityMetaLine` parts refactor. All are unit-testable in the existing `__tests__/` style (suggested: `mapsUrl.test.ts`, `activityMetaParts.test.ts`, updated `feedCard.test.ts` for the tag's new target + untinted dead trip line).

## Design Tokens
| Token | Value | Use |
|---|---|---|
| locationLink (new) | #EA580C | link ink at rest, all surfaces |
| locationLinkPressed (new) | #C2410C | link ink pressed |
| tagWell (shipped, feedTokens) | #FFF0EC | tag chip well at rest |
| tagWellPressed (new) | #FFE0D5 | tag chip well pressed |
| muted meta (shipped) | #78716C | time segment, dead trip line |
| Link weight | 600 | place segments and values |
| Tag label | Inter 11/14 w700 | feed + postcard tags |
| Day-card meta | 12/15 w400 | split meta line |
| Published place | 13/20 | activityPlace |

## Assets
None. The pin is the shipped `Icon name="mapPin"`; no new icons (explicitly: no external-link arrow was adopted).

## Files
- `Geotag Link States Spec.dc.html` — the spec canvas: vocabulary card, dev-shape card, and 4 artboards with rest/pressed/absent states and per-surface notes. *(The canvas's generated `support.js` runtime is not archived — it carries no design information; the live canvas renders in the founder's Claude Design project.)*

## Decision log (designer-facing vs dev-only)
- Designer-chosen: one link ink (#EA580C) everywhere; pin-only chips (no ↗ cue); destination pill re-color; ink-only pressed on plain text; unpadded clock.
- Dev-only calls left open: exact home of the new tokens; whether `activityMetaLine` keeps a joined-string export for old callers; query-scoping joiner (", " assumed).
