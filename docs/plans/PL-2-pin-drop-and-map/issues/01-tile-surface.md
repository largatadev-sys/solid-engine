# 01 — The tile surface

**What to build:** the story's foundation and its principal pure seam — a raster tile
viewer with no map SDK. Web Mercator conversion (`lat/lng ↔ tile x/y/z`, the pixel offset of a
coordinate inside its tile, which tiles cover a viewport at a zoom) extracted as a pure module
with a Jest table, in the `landingSlot.ts` precedent — the component that renders it is not the
seam and must not be the thing under test. Then one `<TileSurface>` drawing that grid from
OpenStreetMap standard tiles, panning by drag and zooming by double-tap, wheel and the +/−
controls, shared by the picker and
the viewer that follow. **The tile URL is server-supplied configuration, never a constant** —
OSM's policy makes access revocable and its own advice is to keep the source switchable.
`© OpenStreetMap contributors` sits bottom-right, tappable to the copyright page: a licence
obligation, not chrome. Read the S4.17 drag findings before starting — pitch measured not
assumed, rounding symmetric, and the worklet/JS split — because a tile grid is the same class
of problem as a drag list.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Projection Jest table: lat/lng → tile, tile → lat/lng, round-trip stability, pixel offset within a tile, viewport coverage at several zooms, and the poles/antimeridian edges
- [x] Rounding is symmetric — a pan of equal magnitude moves the same number of tiles in both directions (the S4.17 `Math.round(-0.5)` trap)
- [x] Surface pans by drag and zooms by pinch, wheel, double-tap and the +/− controls on both native and web, from one implementation
- [x] **Zoom is CONTINUOUS and ANCHORED** — a pinch or a wheel moves it by fractions and keeps the point under the fingers still; only a saved pin rounds, because the column is a `SMALLINT`

  *Ruled out on the walk 2026-09-01, ruled back in 2026-09-03 — and the second ruling carries the cause the first one lacked.* Pinch was removed as "never tracked two fingers convincingly, and the +/− controls make it redundant". That read the symptom, not the fault: `clampZoom` **rounded**, so `zoomAfterPinch` computed a correct continuous `log2` ratio and then threw the fraction away. A pinch could only ever produce whole-number jumps — nothing, nothing, nothing, snap — which is indistinguishable from a broken gesture. The same rounding made wheel zoom coarse, and neither anchored: both zoomed about the map centre, so whatever you were pinching toward slid away. Fixed by splitting `liveZoom` (clamps, keeps the fraction) from `storedZoom` (clamps and rounds, for the wire), tiling at `floor(zoom)` with the pitch scaled by the fraction, and adding `zoomedAt` to hold the anchor still. Native pinch is `Gesture.Pinch()` from react-native-gesture-handler — already a dependency, and the right tool for two fingers where `PanResponder` is not.
- [x] Tile URL resolves from configuration; no provider hostname is a literal in the component
- [x] Attribution renders on the surface and opens the OSM copyright page
- [x] Tiles that fail to load leave the grid usable — no blank screen, no thrown render
