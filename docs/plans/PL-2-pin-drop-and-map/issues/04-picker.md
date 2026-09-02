# 04 — The picker

**What to build:** the screen the founder actually asked for — tap a field, find the place, drop
a pin. A **modal overlay**, never a pushed route: expo-router unmounts the screen beneath a push
on web (S4.18) and the activity form holds its typed place in local state, so a full-screen
picker would eat it on the rung this is verified on. The `DumpPickerModal` shape is the
precedent. It carries the tile surface, a centre crosshair, a search box over ticket 02's
endpoint, and a confirm/cancel bar. A search result **places a draggable pin** rather than
committing one — the geocoder lands near, not on — and **offers** its name for the label rather
than imposing it, applying text and pin **atomically** so acceptance cannot trip the stale-ref
clear. **Confirm is refused without a label.** The map opens on the trip's destination pin,
falling back to the last pin dropped in this trip. **Search is an accelerator, never a
dependency**: when it fails the box says so and panning, dragging and dropping all still work.
Confirming **stages into the draft store** with every other field, so cancelling the form
discards the pin like everything else on that screen.

**Blocked by:** 01 (the tile surface), 02 (search), 03 (validity and the stale-ref rule).

**Status:** ready-for-agent

- [ ] Opens on the trip's destination pin; falls back to the last pin dropped in the trip
- [ ] Typing shows ranked results; tapping one places a draggable pin and offers its name
- [ ] Accepting a result sets text and pin atomically — the stale-ref rule does not fire on it
- [ ] Confirm refused without a label; "Remove pin" clears an existing one
- [ ] Search failure leaves the map, the pan and the manual drop fully working
- [ ] Cancelling the activity form discards the staged pin
- [ ] A11y: the result list is a complete non-visual path — find, choose and confirm without touching the map
- [ ] Playwright: a picker walk asserts the coordinates that reach the save request
