# 01 — Link vocabulary + the published surface

**What to build:** the story's two seams and its first demoable surface. A pure query builder
(`mapsQuery` or equivalent) producing `https://www.google.com/maps/search/?api=1&query=<encoded>`
with the destination-hint rule: append `", <destination>"` when a destination is known and the
place text does not already contain it (case-insensitive) — the rule lives here and nowhere
else. An `openInMaps` `.native.ts`/`.web.ts` split (`Linking.openURL` / `window.open('_blank')`;
no `Linking` use exists in the tree yet). New tokens `locationLink #EA580C` /
`locationLinkPressed #C2410C` beside the shipped sets. Then the published Day-by-Day: the
activity place (already its own Text) takes the link ink with pressed state and a
destination-hinted query, and the header destination pill trades its navy fill for the link
vocabulary (well `#FFF0EC`, ink `#EA580C`; pressed `#FFE0D5`/`#C2410C`) and opens Maps on the
destination string. Every location link carries `accessibilityRole="link"` and the label
`"<place>, open in Google Maps"`. The Playwright fixture gains `window.open` capture (the
dialog-stub family) so specs can assert the URL handed to the opener. Read the archived canvas
(`../design/`) for pixel answers — it is the design baseline.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Query builder Jest table: encoding, hint appended, hint skipped when place already contains the destination, no-destination case, empty-place never linked
- [ ] Published Day-by-Day place opens Maps with the hinted query; pressed ink `#C2410C`; `numberOfLines={1}` holds
- [ ] Destination pill re-colored per the canvas, opens Maps on the destination itself; a11y label says it opens Google Maps
- [ ] Web preview: tap opens a new tab (Playwright asserts the captured URL shape on the published walk)
- [ ] Activities with no place render exactly as today — nothing tappable, no layout shift
- [ ] Full Jest sweep green before push (new files under `src/` — the S4.28 structural-guard rule)
