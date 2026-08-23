# 02 — Skip for now

**What to build:** every onboarding step offers a way out. A traveler who does not want to answer taps "Skip for now" and lands wherever they were going — the invite they arrived with, or Home — and is never asked again.

Skipping is the existing completion call with the questions unanswered. There is no new endpoint, no new field, and no `skipped` flag: nothing in the app asks whether a traveler finished or declined, and an /v1 field can never be removed (ADR-008).

**Blocked by:** 01 — the gate must be routing on the right traveler before a new exit from it can be trusted.

**Status:** ready-for-agent

- [ ] Every counted step offers the skip, from one definition rather than four copies — a new step added later inherits it without being told to.
- [ ] Skipping records completion, so the flow is never offered again on any later sign-in.
- [ ] Skipping lands the traveler exactly where finishing would have: the pending invite if there is one, Home if not, and the token is spent on the way out either way.
- [ ] Skipping leaves the handle null rather than claiming the suggested one (spec D1). A null handle already renders correctly everywhere — the meta line omits it, the roster falls back to the display name — and claiming would give skip a failure mode it must not have.
- [ ] Skipping cannot fail in a way the traveler cannot act on: one call, and a failure leaves them on the step with a message rather than stranded.
- [ ] A register #2 analytics event names the step the skip was taken from, so the flow's cost is measurable rather than argued about.
- [ ] The exit-path guard covers it the way it covers finishing — by scanning the onboarding directory, so a screen that forgets the skip fails the test.
