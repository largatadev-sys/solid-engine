# 05 — The activity form: the mock's five fields, the ruled corrections, the cull

**What to build:** `add-activity` / `edit-activity` per the mocks and the digest's rulings (spec decision 8) — five fields, corrected slips, four shipped fields removed from the form, booking as a pasted URL.

**Blocked by:** 03 (entry points from the accordion).

**Status:** needs-triage

- [ ] Field set, exactly: Activity Name · Time (clock icon, time picker, 12-hour display) · Location / Venue (map-pin, free text → `place`) · Estimated Price (**price input + currency affordance** — the digest's corrected slip; `costAmount`/`costCurrency`, currency defaulting to the traveler's preference as today) · Booking Link *(Optional)* (link icon, pasted URL → `externalUrl`).
- [ ] The mock's form styling verbatim: labels Inter 600 16 capitalize · inputs 48px border `#757575` radius 4 · placeholders per mock · focus state border 1.5 `#E8613A` · orange leading icons.
- [ ] CTAs: "Save Activity" primary; secondary **"Cancel"** on Add (corrected slip) and **"Discard Changes"** on Edit — both leave without saving.
- [ ] Culled from the form: Description, Notes & Creator Tips, Photos strip, Move-to-day, and the Booking Integration card editor. The request builder must not clear the culled fields on edit — an untouched field stays untouched on the wire (existing data survives a rename).
- [ ] Titles per mock: "Add Activity" / "Edit Activity" (the current "Daily Activity" retires).
- [ ] Saving inside the holder's session needs no activity lease (ticket 01's subsumption); the form is only reachable from the editor.
- [ ] Unit tests: request builder preserves culled fields · corrected-slip behaviors (price input, Cancel) pinned.
