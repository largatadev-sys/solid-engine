# 05 — The viewer, and where taps land

**What to build:** the reading half, and the one change PL-1's surfaces need. A **pushed route**
carrying the tile surface with a pin at its stored zoom — **interactive**, panning and zooming,
because a map that cannot move reads as broken to anyone who has used a map. Inside it, an
**Open in Google Maps** action built on PL-1's existing query builder: directions are the thing
travelers most often want from a map and the thing we will never provide, so the escape stays
one tap away. Then the routing rule across every surface PL-1 touched: **a pinned place opens
the viewer; a text-only place keeps handing off to Google Maps exactly as it does today** — that
fallback is permanent by the no-backfill ruling, not transitional. It applies to the workspace
day card, the published Day-by-Day, and the published header destination pill. Postcards and
diary entries are **deliberately untouched** — they carry no pin and keep PL-1's behaviour
whole. The viewer announces the **label**, never raw coordinates.

**Blocked by:** 01 (the tile surface), 03 (pins on the wire).

**Status:** done

- [x] Viewer route opens at the pin's stored zoom and pans and zooms from there
- [x] Open in Google Maps asks for the named place anchored at our point, falling back to bare coordinates and then to PL-1's destination-hinted query *(founder ruling, 2026-09-01: a coordinate query drops the traveler on a dot rather than the place)*
- [x] A pinned place opens the viewer; a text-only place still opens Google Maps, on every surface PL-1 touched
- [x] The published header destination pill opens the viewer when the destination is pinned
- [x] Postcard and diary-entry tags are byte-for-byte unchanged in behaviour
- [x] A11y: the location announces as its label plus that it opens a map — never coordinates
- [x] Playwright: a viewer walk proves the pinned/text-only split, reusing PL-1's `window.open` capture for the text-only half
