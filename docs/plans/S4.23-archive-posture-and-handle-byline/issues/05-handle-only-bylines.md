# 05 — Handle-only bylines

**What to build:** Spec decision 5, mobile only — a privacy posture, not a restyle. The shown identity on every stranger-facing feed surface becomes `@handle`, with **"A traveler"** for a handle-less author — never the display name, which is the whole point of the fallback choice. Two surfaces: the feed card's byline and the public trip diary header reached through it. Everything derived from identity on those surfaces follows the shown identity — avatar initials and accessibility labels derive from the handle or the anonymous fallback, not the hidden name. Membership surfaces (roster, travelers, own profile, own diary) keep display names and are out of bounds. Recorded as a founder override of the S4.22 mock's byline (spec's deviations section); no backend change — the wire already carries both fields.

**Blocked by:** None — client-side, independent of the backend tickets.

**Status:** ready-for-agent

- [ ] The anatomy modules derive the shown identity handle-first with the anonymous fallback; the display name is unreachable from the stranger surfaces' derivations (spec AC 7).
- [ ] Feed card byline and public diary header render `@handle`; handle-less renders "A traveler" (spec AC 7).
- [ ] Initials and accessibility labels derive from the shown identity (spec AC 7).
- [ ] Jest on the anatomy modules covers: handled author, handle-less author, and the tagged-fixture shape the pool renders.
- [ ] The feed walk's byline assertions update to expect handles against the seeded demo data.
