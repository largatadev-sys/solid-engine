# 03 — The traveler forks

**What to build:** the whole client flow from reading someone's published itinerary to standing in your own copy's workspace: the docked **Fork This Trip** CTA, the zero-input confirm sheet, the fork call, and the success screen — ending with back landing on Trips and the new draft sitting in Trips' Draft section. The design baseline (`design-baseline.dc.html` beside the spec) binds under the mock-fidelity rule.

**Blocked by:** 01 — Fork lands at the API · 02 — Provenance and the count reach the wire.

**Status:** done

- [x] The published page shows the docked CTA bar with one primary "Fork This Trip" for the consumer audience only — the pre-publish preview never shows it; content scrolls under the bar
- [x] The CTA opens the confirm sheet per the baseline: title, body, three highlight rows (the first naming the source's @handle), the honesty line "The plan copies. Photos and dates don't.", primary Fork It, secondary Cancel — the sheet collects nothing
- [x] Fork It in flight: spinner on the primary, both buttons disabled, no double-fire — one tap mints exactly one trip
- [x] The fork call goes through the repository layer's typed client (no raw fetch — ADR-001)
- [x] Success per the baseline: fork-glyph halo (not the party popper), "Trip Forked!", body naming the copied title, summary card whose 64px thumb shows the **placeholder deliberately** with "Destination • N Days" meta (no dates), attribution pill from `forkedFrom`, one primary **Open Trip Workspace** into the new draft's workspace — no secondary
- [x] Navigation is the Trip Created pattern: replace into the trips context, so back from success lands on Trips, never the sheet or the spent published screen; the draft is visible in Trips' Draft section
- [x] Pure modules carry the decisions and are Jest-covered: attribution label ("Original by @handle" / "Original by a traveler"), the pill's link-vs-plain choice from `sourceVisible`, sheet and success copy
- [x] `tsc --noEmit` clean; affected Jest files green

## Comments
