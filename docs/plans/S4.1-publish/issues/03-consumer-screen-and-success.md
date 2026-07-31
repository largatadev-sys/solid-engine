# 03 — The consumer screen and the success arc

**Status:** ready-for-agent

**What to build:** a signed-in non-member opens a published itinerary by direct route and reads it as the published-itinerary mock draws it: the shared header (cover placeholder · destination pill + derived duration · creator block · stats board) over the **five-tab shell** — Overview and Day-by-Day **real** (reusing ticket 02's projection render; Overview carries description, Standouts slot, best-time, the derived cost stat; Day-by-Day the read-only accordions with time rail, place, cost, tips, bare booking link), and Diary Entry / Comments / Reviews **greyed** through the shared `comingSoon` helper with a register-#2 analytics call each (their semantics belong to S4.2/S4.6/S4.5). The stats board's rating and fork count grey to S4.5/S4.7; Follow greys to the friend graph. The publish flow completes with the **success screen** (frame 7): Copy Link copies this screen's working route, Share opens the system sheet. Until S4.3, this direct route is the only doorway — that is the recorded scope, not a gap.

**Blocked by:** 02 — the projection and the preview.

- [ ] The full arc walks on device and preview container: owner publishes (preview → publish → success), a non-member pool account opens the copied link and reads the projection (spec AC 1; state which tag played which role)
- [ ] Five tabs render; Overview wins the mock's five-vs-four inconsistency; the three greyed tabs fire analytics and dead-click nowhere on web (spec AC 11)
- [ ] Rating, fork count, and Follow grey with analytics; the est-total stat is real and matches the projection payload
- [ ] Copy Link produces a route that resolves for another signed-in account; Share opens the sheet on the device
- [ ] A member and the owner can open the published page too — the projection is one page for every audience
- [ ] The cover slot renders the placeholder treatment (upload activates at S3.3)
