# 04 — Postcard tags

**What to build:** `DiaryEntryResponse.place` ships in the payload today and no postcard
surface renders it — introduce the location tag (feed treatment verbatim: well `#FFF0EC`, pin
glyph, ink `#EA580C` bold 11, same pressed states, single-line ellipsis, `alignSelf:
flex-start`, `maxWidth: '100%'`) on three surfaces: **PostcardStreamEntry** (between title and
photo stage), **Postcard** — the trip-diary/profile card — (under the title row, above the
caption), and **DiaryEntryScreen**'s snapshot header (read-only chrome, tappable even
mid-edit, not a form field). Skipped entirely when `place` is null — no layout ghost. The tag
is a sibling pressable, never inside a card's existing summary press target: postcard tap
still opens the entry, tag tap opens Maps. Query: the entry's own place string, hinted with
whatever trip destination the surface has in context, plain otherwise (ticket 01's builder
decides — the contains-check handles snapshots that already carry context).

**Blocked by:** 01 (uses the query builder, opener split, and tag pressed tokens).

**Status:** ready-for-agent

- [ ] Tag renders on all three surfaces when place exists; absent entirely when null
- [ ] Tag tap opens Maps; tapping anywhere else on the card still opens the entry (sibling pressables, no nesting)
- [ ] Entry screen: the tag sits in the snapshot header and stays tappable mid-edit; it gains no form affordance
- [ ] Pressed states match the feed tag; single-line ellipsis on long places
- [ ] A11y: `role="link"`, `"<place>, open in Google Maps"` on every tag
- [ ] Playwright diary walk: one captured Maps URL from a stream-entry tag tap
