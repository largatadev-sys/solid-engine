# 02 — Workspace day-card meta split

**What to build:** the workspace day card's activity meta line becomes two segments so the
place alone is tappable. `activityMetaLine()` returns parts `{clock, place}` instead of one
joined string (keep a joined export if other callers need it); the row renders
`<Text numberOfLines={1}>clock • <Text onPress>place</Text></Text>` — clock and separator stay
muted `#78716C`, the place segment takes `locationLink` weight 600 with ink-only pressed
feedback. The clock format unifies on the diary's unpadded shape ("7:00 AM", the
`postcardClock` precedent) while the line is being split. The tap target is the text run
itself — do not wrap the whole meta line, a mis-tap on the time must not open Maps. Query is
destination-hinted via ticket 01's builder. Rows without a place render exactly as today.

**Blocked by:** 01 (uses the query builder, opener split, and tokens).

**Status:** ready-for-agent

- [ ] Parts helper Jest table: clock formats (unpadded), null place, place-only, both
- [ ] Day-card place segment opens Maps with the hinted query; time and separator are not tappable
- [ ] Pressed state is ink-only (`#C2410C`), no wash, no scale
- [ ] `numberOfLines` clamps on the outer Text; long place names ellipsise without wrapping the row
- [ ] A11y: place segment is `role="link"`, label `"<place>, open in Google Maps"`
- [ ] Playwright: the workspace walk asserts one captured Maps URL from a day-card tap
