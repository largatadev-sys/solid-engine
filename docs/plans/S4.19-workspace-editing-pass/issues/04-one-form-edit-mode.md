# 04 — One form, edit mode

**What to build:** Editing a trip re-houses onto the shared form in edit mode: headline "Edit Trip", submit **"Save"** (was "Save changes"), success returns to the screen it came from, back-exit abandons cleanly with the header lock released. Edit mode's field set = the shared fields plus **Start/End dates — and no Duration** (spec decisions 3 and 4: dates never touch the day list; the coupling was explicitly killed at the grilling). Cover behavior stays edit's own: live upload/remove under the held header lease (spec decision 5). The archived/published frozen notices carry over unchanged, as do the screen's two existing doors (the editor header pencil, the Details tab link) — no new entry points.

**Blocked by:** 03 — One form, create mode (the shared component and mode contract are born there).

**Status:** done

- [x] Edit round-trips every field — title, destinations, description, standouts, best time, dates — through the existing update endpoint (spec AC 4).
- [x] The submit button reads "Save"; success pops back to the origin; back-exit releases the lock and persists nothing new.
- [x] Editing dates in any direction leaves the day list untouched: count, names, activities (spec AC 6).
- [x] Edit mode shows no Duration field; the mode contract's unit tests pin edit's field set and chrome.
- [x] Cover upload and remove still work live under the lease; the frozen notices still render for archived/published trips (spec AC 5, edit half; AC 4).
- [x] The old standalone edit-screen form code is gone; typecheck clean; the edit walk runs on the emulator and the web preview container.
