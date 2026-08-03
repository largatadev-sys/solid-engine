# 03 — Publishing explains its precondition; routing follows discovery

**Status:** done

**What to build:** publishing becomes two acts — mark complete, then publish — and the UI **says so** rather than hiding a control the traveler is looking for. On a draft or active trip the Publish CTA states that only a completed trip can be published and points at the control that fixes it; a disabled button with no reason is the failure mode S4.9 already ruled against. The audience picker stays where S4.1 put it (preview screen, Public default) and additionally becomes a plain toggle in Details, since the audience is settable before publishing. Routing keys on **discovery**: unpublished trips (draft *or* active *or* complete) open the workspace, published ones open the itinerary overview (spec decision 2; ACs 4, 11, 13).

**Blocked by:** 02 (the lifecycle controls the message points at).

- [x] Publishing from draft or active shows the precondition in words, naming *Mark complete* as the way through — never a bare disabled button
- [x] The 409 `ITINERARY_NOT_COMPLETE` from the API surfaces as that same message, so a race gives the same wording as the pre-check
- [x] Publishing a completed trip succeeds and defaults to Public; the success arc and published page are unchanged from S4.1
- [x] The audience toggle works before publishing and after, and never changes `published` or `state`
- [x] Drafts and active trips route to the workspace; published trips route to the itinerary overview
- [x] A published trip's editor shows the frozen notice rather than the form (S4.1 behaviour, re-verified against `published`)
- [x] Walked end to end on the device: create → start → complete → publish → freeze → unpublish → thaw
