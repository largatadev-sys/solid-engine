# 04 — Attribution lives where the trip lives

**What to build:** provenance renders everywhere the forked trip does, and the source's popularity goes honest: the S4.17 reserved workspace subtitle finally draws "Original by @handle", a published fork's public page carries the same credit, and the source page's Forked stat becomes a real number that is no longer a button.

**Blocked by:** 02 — Provenance and the count reach the wire *(runs in parallel with 03)*.

**Status:** done

- [x] The workspace subtitle on a forked trip renders "Original by @handle" from `forkedFrom`; non-forked trips render nothing there (the slot stays empty, as since S4.17)
- [x] A handle-less source author renders "Original by a traveler" — the display name never appears on any fork surface (S4.23 posture)
- [x] While `sourceVisible`, the attribution (subtitle and success pill) is tappable and opens the source's published page; when false it renders as plain text with no link affordance — never a dead click, never a tap into a 404
- [x] The published projection of a forked itinerary shows the attribution line on its public page with the same link/plain behavior
- [x] The source's published page renders `forkCount` in the Forked stat as a plain, non-tappable stat — visually identical to Est. Cost; the coming-soon tap retires
- [x] Pure-module Jest covers the subtitle/label decisions; `tsc --noEmit` clean; affected Jest files green

## Comments
