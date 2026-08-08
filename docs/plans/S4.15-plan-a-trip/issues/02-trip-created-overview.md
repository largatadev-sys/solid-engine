# 02 — The Trip Created overview

**What to build:** Creating a trip lands on confirmation, not the day builder. On **Create Trip** the trip is created exactly as today (born `draft`, Duration mints its days) and the traveler lands on a **Trip Created** overview reached by replace-navigation, so back — hardware or web — lands on Trips, never the spent form. The screen shows the state-honest copy (title **"Trip Created!"**; body: the trip's title in regular double quotes — **“⟨trip title⟩” is saved to your trips. Open the workspace to start building the days.**), a summary card (cover thumb or neutral placeholder · title · **"Destination • N Days"**, destination alone when Duration was skipped), a **greyed** primary **"Open Trip Workspace"** that fires the coming-soon dialog on both platforms (the workspace-redesign story re-points it at the new workspace — never the old one), and a live secondary **"Preview Trip"** opening the preview. The publish-success screen is a different moment and stays untouched (spec decisions 2–3; the S4.13 decision-11 reversal).

**Blocked by:** 01 — The Plan a Trip form *(soft edge: this rewires the same flow's submit landing; sequencing avoids same-surface churn)*.

**Status:** ready-for-agent

- [x] Create Trip lands on the overview via replace; back lands on Trips on device and web (spec AC 3).
- [x] Copy matches spec decision 2 exactly; "available for travelers to discover and fork" appears nowhere.
- [x] Summary meta reads "Destination • N Days", destination alone without Duration.
- [x] The greyed "Open Trip Workspace" fires the coming-soon dialog on native **and** web (the dead-click rule); "Preview Trip" opens the preview (spec AC 4).
- [x] Publish-success behavior is unchanged and its existing tests stay green (spec AC 9).
- [ ] Copy strings and the meta-line branch are pinned by unit tests; emulator walk reaches the day builder via Preview → Continue Editing; the web-preview driver walks the same with the alert intercepted and asserted.

## Comments

- *2026-08-08, implementation:* code complete, typecheck clean, full mobile suite green (1933 tests). The unticked box is compound — its **unit-test half is done** (`tripCreatedCopy.test.ts` pins the copy and both meta branches); the **walk half** (spec AC 8: emulator Preview → Continue Editing, and the web driver with the alert intercepted) needs the local rig and has not been run, so the box stays open rather than being claimed.
