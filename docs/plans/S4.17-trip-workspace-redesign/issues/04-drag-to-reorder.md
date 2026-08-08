# 04 — Drag-to-reorder: the grip becomes a gesture, the arrows graduate

**What to build:** the backlog line's reserved decision, discharged here (spec decision 7) — a real drag gesture on the editor's activity rows driving S4.9's version-checked `PUT /order`.

**Blocked by:** 03 (the accordion the rows live in).

**Status:** needs-triage

- [ ] The gesture-library decision is made and recorded in this ticket's comments (candidates per the backlog line: `react-native-draggable-flatlist` / `react-native-reorderable-list`, each pulling gesture-handler + reanimated — a config-plugin-scale dependency; prebuild required).
- [ ] Native: long-press-drag on the grip reorders within the day; drop persists through the version-checked PUT; a stale reorder surfaces the 409 refresh path, never a silent overwrite.
- [ ] Web: the backlog line's weighed fork is decided — native drag + arrows-kept-on-web is the recorded cheaper option; whichever ships, reorder works on the web preview.
- [ ] The arrows graduate from the default UI; they remain wherever they are the accessibility path (screen-reader reorder must still be possible — the line's own constraint).
- [ ] Reorder inside the holder's session needs no per-subject lease (ticket 01's subsumption).
