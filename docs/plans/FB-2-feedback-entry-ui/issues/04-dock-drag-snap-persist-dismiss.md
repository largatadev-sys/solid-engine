# 04 — The drag: glide, snap, persist, dismiss

**What to build:** the dock's gesture system, on the two-lane rule the grilling settled
(spec decision 1). The geometry extracted to a pure module — nearer-rail choice, clamp,
fraction round-trip, the 4px tap/drag threshold, the dismiss-zone hit test — because the
component cannot render under Jest. Native tracks the finger 1:1 and springs to the nearer
rail on release; web is press → jump-to-release, no tracking, the release point choosing the
rail (S4.38 — do not re-attempt its ruled-out causes). Edge rails fade in during a drag; a
dismiss target fades in at bottom-center, and dropping the bubble on it — on web, releasing
inside it — sets `'hidden'`. Position persists as edge plus a 0–1 fraction of the clamped
range and re-clamps on layout change.

**Blocked by:** 02.

**Status:** done

- [ ] Geometry module Jest: nearer-rail at the midline, clamp at both ends (web floor 12), fraction round-trip across a resize, sub-threshold travel classified as a tap, dismiss-zone hit and miss
- [ ] Native: the bubble follows the finger, overdrags 12px past a rail, and springs back to inset 16 keeping its vertical position
- [ ] Web: release right of centre docks right, left docks left; no tracking is claimed or asserted anywhere; the click-after-drag is suppressed past 4px
- [ ] The disc alone takes `touchAction: none` and context-menu/long-press suppression — the screen behind it still scrolls
- [ ] Dropping on the dismiss zone hides the bubble on both platforms and persists `'hidden'`
- [ ] A parked position survives relaunch on both platforms; a browser resize re-clamps without drifting under chrome
- [ ] Under 4px of travel still opens the sheet
