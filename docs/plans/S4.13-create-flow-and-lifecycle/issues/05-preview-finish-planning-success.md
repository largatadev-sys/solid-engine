# 05 — Preview, Finish Planning, and the re-homed success

**What to build:** the flow's honest ending. The traveler previews their itinerary as a reader would see it, taps **Finish Planning**, and lands on the workspace with the trip at `upcoming`. The celebration chrome fires only when a completed trip actually publishes.

**Blocked by:** 01 (the `draft → upcoming` endpoint) · 04 (the flow this terminates).

**Status:** ready-for-agent

- [ ] The preview renders per the mock: destination pill + derived "N Days"; owner byline (avatar, name, @handle — resolved to the current owner); title; stats card with **true zeros** for Reviews and Forked and **"Est. Cost"** (the derived single-currency total — never "/Person", decision 10); Overview / Day-by-Day tabs; the photo gallery greyed (S3.3); description and Standouts as drawn.
- [ ] The banner reads *"This is a preview of your itinerary page — what other travelers will see if you publish."* — the honest tense (decision 10).
- [ ] The terminal CTA is **"Finish Planning"** — never "Complete" (decision 2). Tapping it moves `draft → upcoming`, lands the traveler on the workspace with at most a toast; no celebration screen fires.
- [ ] "Continue Editing" returns to the flow without a transition.
- [ ] The published-success chrome (party-popper, "Your Itinerary is Live!", discover-and-fork copy, Copy Link / Share to…, View Published Itinerary) fires **only** from the publish act on a `completed` trip — re-homed untouched (decision 11); nothing in the creation flow can reach it.
- [ ] Finish Planning respects the ladder: refused (with the reason named) if the trip is not `draft` — a stale screen cannot double-fire it.
- [ ] The web preview proves the walk by driving the rebuilt container (intercepting `window.alert`); the device walk closes on the emulator.
- [ ] Mobile suite + `tsc` green.
