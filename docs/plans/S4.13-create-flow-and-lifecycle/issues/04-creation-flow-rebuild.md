# 04 — Creation flow rebuild: trip details, daily schedules, activity form

**What to build:** the drawn creation walk — a traveler taps Create Itinerary and moves through trip details, daily schedules and the activity form exactly as the frames draw them, ending at the preview door. Frame-faithful per the mock rule; every deviation below is a recorded ruling, not a choice.

**Blocked by:** 03 — the booking card (the activity form composes it).

**Status:** done

- [x] **Trip details** (create-entry): cover drop-zone rendered greyed (S3.3); Trip Title; **Destination as free text** (the picker affordance dies — decision 12); Duration control that **mints Day 1…N at creation and never reappears** (decision 8); Best Time of year; Trip Description; the selling-points list labeled **Standouts** with **"Add Standout"** (decision 13 — "Highlights" appears nowhere); "Continue to Daily Schedules" in the mock's footer dock.
- [x] **Daily schedules**: day-tab chips per the mock (active dark, inactive outlined); the **+** square adds a day — the only day-count editor after creation; Day N Title field; dashed Add Activity row; "Preview Itinerary" footer CTA.
- [x] **Activity form** ("Daily Activity"): Activity Name; Time + Estimated Cost two-up (₱ placeholder rendered correctly, not the export's mojibake); Location free text; Description; Notes & Creator Tips; the photo row greyed (S3.3); the booking card from ticket 03 placed per the frame; Save Activity footer.
- [x] Field chrome matches the mock's visible-state values (fill, border, radius, label style) through the token layer — no hardcoded values in screens.
- [x] Every surface that shows a day count derives it from the days themselves; adding a day via **+** updates them all with no reconciliation control anywhere.
- [x] Deleting a day renumbers per ADR-013's contiguity rule, unchanged.
- [x] The walk works on web and device alike (the standing web ≈ mobile principle; any RN API fronting a native dialog gets its web fork — the S1.3 Alert lesson).
- [x] Mobile suite + `tsc` green; the flow walkable end-to-end in the preview container. *(The emulator half is ticket 06's, still open.)*
