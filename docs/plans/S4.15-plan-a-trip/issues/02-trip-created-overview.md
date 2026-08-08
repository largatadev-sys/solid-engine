# 02 — The Trip Created overview

**What to build:** Creating a trip lands on confirmation, not the day builder. On **Create Trip** the trip is created exactly as today (born `draft`, Duration mints its days) and the traveler lands on a **Trip Created** overview reached by replace-navigation, so back — hardware or web — lands on Trips, never the spent form. The screen shows the state-honest copy (title **"Trip Created!"**; body: the trip's title in regular double quotes — **“⟨trip title⟩” is saved to your trips. Open the workspace to start building the days.**), a summary card (cover thumb or neutral placeholder · title · **"Destination • N Days"**, destination alone when Duration was skipped), a **greyed** primary **"Open Trip Workspace"** that fires the coming-soon dialog on both platforms (the workspace-redesign story re-points it at the new workspace — never the old one), and a live secondary **"Preview Trip"** opening the preview. The publish-success screen is a different moment and stays untouched (spec decisions 2–3; the S4.13 decision-11 reversal).

**Blocked by:** 01 — The Plan a Trip form *(soft edge: this rewires the same flow's submit landing; sequencing avoids same-surface churn)*.

**Status:** ready-for-agent

- [x] Create Trip lands on the overview via replace; back lands on Trips on device and web (spec AC 3).
- [x] Copy matches spec decision 2 exactly; "available for travelers to discover and fork" appears nowhere.
- [x] Summary meta reads "Destination • N Days", destination alone without Duration.
- [x] The greyed "Open Trip Workspace" fires the coming-soon dialog on native **and** web (the dead-click rule); "Preview Trip" opens the preview (spec AC 4).
- [x] Publish-success behavior is unchanged and its existing tests stay green (spec AC 9).
- [x] Copy strings and the meta-line branch are pinned by unit tests; emulator walk reaches the day builder via Preview → Continue Editing; the web-preview driver walks the same with the alert intercepted and asserted.

## Comments

- *2026-08-08, implementation:* code complete, typecheck clean, full mobile suite green (1933 tests); `tripCreatedCopy.test.ts` pins the copy and both meta branches.

- *2026-08-08, walked on both rungs — all boxes close.* **The `replace` is proven where it matters: hardware back from the overview landed on Trips**, with the new trip at the top of Drafts — not the spent form. **The greyed door speaks on both platforms**: the web driver intercepted the alert (`present  Trip Workspace`) and the emulator screenshot shows the native dialog *"The Trip Workspace — coming soon"* — no dead click on either fork. **Preview Trip** opened the preview and reached "Continue Editing" on web; on the emulator the card tap opened the day builder showing **Day 1 · Day 2 · Day 3** minted from Duration=3, so day-minting survives the new landing. Copy rendered exactly as decision 2 wrote it, straight quotes included.

  *One diagnostic worth keeping:* the driver first reported `click Open Trip Workspace -> NOT FOUND` and raised no alert — which reads precisely like the S1.3 dead click this AC exists to catch. It was neither: the button's accessibility label is `"Open Trip Workspace, coming soon"` and the driver matches labels exactly, so the click never landed. **The `NOT FOUND` line is what distinguished the two** — a driver that had silently clicked nothing and reported `ok` would have produced the same missing alert and sent the investigation into the component.
