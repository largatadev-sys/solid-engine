# 02 — The words catch up: "Active" label + honest unpublish copy

**What to build:** The trip being lived reads **"Active"** everywhere state renders — the viewer's badge and the trips-list rows — while the wire, the TS union and storage keep `ongoing` (label only, the `upcoming`/"Ready" pattern; ADR-026 priced the wire rename and declined it). The unpublish confirm dialog stops claiming the trip "goes back to being a draft" — false since the axes split, only `published` flips — and says what unpublish does: the public page comes down and editing thaws.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] `ongoing` renders "Active" on the viewer badge and every state-rendering list row; "Ongoing" appears nowhere a traveler looks
- [x] Label only: no wire value, TS union member or stored enum spelling changes
- [x] The unpublish confirm copy states the page comes down and editing thaws; no "returns to a draft" claim survives anywhere (the published-plan notice included)
- [x] Copy/label tests updated, including any walk expectation that asserts "Ongoing"
