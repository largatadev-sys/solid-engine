# 04 — Drag-to-reorder: the grip becomes a gesture, the arrows graduate

**What to build:** the backlog line's reserved decision, discharged here (spec decision 7) — a real drag gesture on the editor's activity rows driving S4.9's version-checked `PUT /order`.

**Blocked by:** 03 (the accordion the rows live in).

**Status:** done

- [x] The gesture-library decision is made and recorded in this ticket's comments (candidates per the backlog line: `react-native-draggable-flatlist` / `react-native-reorderable-list`, each pulling gesture-handler + reanimated — a config-plugin-scale dependency; prebuild required).
- [x] Native: long-press-drag on the grip reorders within the day; drop persists through the version-checked PUT; a stale reorder surfaces the 409 refresh path, never a silent overwrite.
- [x] Web: the backlog line's weighed fork is decided — native drag + arrows-kept-on-web is the recorded cheaper option; whichever ships, reorder works on the web preview.
- [x] The arrows graduate from the default UI; they remain wherever they are the accessibility path (screen-reader reorder must still be possible — the line's own constraint).
- [x] Reorder inside the holder's session needs no per-subject lease (ticket 01's subsumption).

## Comments

**2026-08-08 — the gesture-library decision: neither candidate; `react-native-gesture-handler` directly, which is already a dependency.**

The backlog line reserved this decision on the premise that a drag gesture *"needs a native gesture library … a config-plugin-scale dependency decision no single ticket had a mandate to make."* **That premise expired before this story reached it.** `react-native-gesture-handler` and `react-native-reanimated` are already **direct dependencies** in `mobile/package.json`, required by `expo-router` and `expo-modules-core`; their natives compile into every dev build this repo makes (CLAUDE.md's JDK gotcha records builds reaching `:react-native-worklets:configureCMakeDebug` — worklets *is* reanimated 4's engine). So there is **no new dependency, no config plugin, and no prebuild decision** left in this line. Verified rather than assumed, because the cost of being wrong was a native-build detour:

- `babel-preset-expo` (nested under `expo/node_modules`) **auto-injects the worklets plugin when the package is installed** — `configs/expo.js`: *"Automatically add worklets or reanimated plugin when package is installed."* No `babel.config.js` is needed, and hand-adding the plugin on top would double-apply it.
- `GestureHandlerRootView` is **not** mounted by expo-router — grepped its build output and found none — so this ticket adds it at `app/_layout.tsx`. Without it the pan gesture is silently inert, which is the failure mode this repo keeps naming: a control that renders and does nothing.

**Why neither `react-native-draggable-flatlist` nor `react-native-reorderable-list`:** both are **FlatList replacements that want to own scrolling**, and our rows live inside an expanded day card inside the editor's `ScrollView`. That nesting is precisely where they fight the outer scroll. Adopting one to reorder a capped, short list (activity rows within a single day) would buy autoscroll-during-drag we do not need and cost a scroll-ownership conflict we would then work around. `Gesture.Pan` on the grip, translating the row and mapping the drop to a slot index, is ~100 lines with no new dependency. **The gesture library *is* gesture-handler.**

**The web fork takes the line's own recorded cheaper option: native drag, arrows kept on web.** `DraggableActivityList.native.tsx` carries the pan; `DraggableActivityList.web.tsx` renders the same rows with up/down controls. A drag is a native gesture, so this is the standing "web ≈ mobile except native gestures" principle, not a shortfall.

**The arrows do not disappear — they change platform and role.** On web they are the reorder UI. On native they survive as `accessibilityActions` (`moveUp`/`moveDown`) on each row, wired to the same `applyMove` reducer the drag's `applyDrop` sits beside — so **screen-reader reorder stays possible on both platforms**, which was the line's own constraint.

**Both paths share one persistence route:** `applyDrop`/`applyMove` → the version-checked `PUT /order` with `expectedActivityIds`, and a `STALE_REORDER` 409 re-reads the day and re-applies the *intent* against fresh ids rather than overwriting. That recovery is not new code — it was lifted from the retired `days/index.tsx` (`git show` on the commit that deleted it) rather than reinvented.
