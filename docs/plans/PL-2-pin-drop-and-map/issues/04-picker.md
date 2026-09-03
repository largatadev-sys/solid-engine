# 04 — The picker

**What to build:** the screen the founder actually asked for — tap a field, find the place, drop
a pin. A **modal overlay**, never a pushed route: expo-router unmounts the screen beneath a push
on web (S4.18) and the activity form holds its typed place in local state, so a full-screen
picker would eat it on the rung this is verified on. The `DumpPickerModal` shape is the
precedent. It carries the tile surface, a **fixed centre pin the map moves under** — the Uber
and Grab pattern, **ruled by the founder on the walk (2026-09-01)** after the built-then-rejected
tap-to-drop and drag-the-pin shapes: a pin the finger never has to hit is the one gesture a
phone makes easy — a search box over ticket 02's endpoint, and one confirm CTA. Panning
**reverse-geocodes what is under the pin** after a settle, and **offers** that name for the label
rather than imposing it, applying text and pin **atomically** so acceptance cannot trip the
stale-ref clear. **Confirm is refused without a label.** The map opens on the trip's destination pin,
falling back to the last pin dropped in this trip. **Search is an accelerator, never a
dependency**: when it fails the box says so and panning to place a pin still works.
Confirming **stages into the draft store** with every other field, so cancelling the form
discards the pin like everything else on that screen.

**Blocked by:** 01 (the tile surface), 02 (search), 03 (validity and the stale-ref rule).

**Status:** done

- [x] Opens on the trip's destination pin; falls back to the last pin dropped in the trip
- [x] The trip form captures the DESTINATION pin too — story 7's half of the picker, without which the fallback above is the only thing standing between an activity picker and a world view
- [x] Typing shows ranked results; tapping one centres the map on it under the fixed pin and offers its name
- [x] Accepting a result sets text and pin atomically — the stale-ref rule does not fire on it
- [x] Confirm refused without a label; "Remove pin" clears an existing one
- [x] Search failure leaves the map and the pan-to-place fully working
- [x] Cancelling the activity form discards the staged pin
- [x] A11y: the result list is a complete non-visual path — find, choose and confirm without touching the map
- [x] Playwright: a picker walk asserts the coordinates that reach the save request
