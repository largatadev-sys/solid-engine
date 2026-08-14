# 03 — Draft Workspace, Editing Session, activity form, buffered saves

**What to build:** The retired workspace walk's coverage rebuilt from the flow inventory (§2), plus the living `drive-buffered-plan` and `drive-edit-lock` walks ported — they drive the same surface and share its fixtures. Dark flows first: the Finalize act, the ladder from the viewer, and the session release. Two identities exercise the single-holder Editing Session for real.

**Blocked by:** 01 — Foundation + the discovery pilot.

**Status:** ready-for-agent

- [ ] A draft opens the workspace carrying the **Draft badge**; the header offers **Edit Itinerary**; the six-tab row renders in mock order
- [ ] Entering the editor **acquires the Editing Session server-side**; the second identity is **refused** while the first holds it; the viewer says who is editing
- [ ] A Ready trip's editor is **read-only** — no editing affordance renders
- [ ] **Finalize** opens the confirmation sheet with the mock copy; **Keep Editing** dismisses leaving a draft; **Finalize** fires finish-planning, shows **Ready**, and **releases the session on the way out**
- [ ] **Start Trip** walks the ladder to ongoing; **Step back** moves exactly one rung, never two
- [ ] The activity form opens from a row on **Edit Activity**, shows exactly the mock's five fields (the four culled fields absent), offers **Save Activity** and **Discard Changes**
- [ ] Every plan op **stages** until **Save Changes**; the save commits in one act and the plan survives a reload
- [ ] The exit guard's confirm wording is captured as evidence, never silently auto-accepted
- [ ] Retired routes (`?day=` deep link, the old day view) redirect into the workspace, never dead-end
- [ ] **Polls**, **Chat** and **Photo Dump** grey with a message rather than dead-clicking
- [ ] Every `/v1` call from the workspace carries a bearer token
- [ ] `drive-buffered-plan.js` and `drive-edit-lock.js` are deleted
