# 05 — Every author tap routes

**What to build:** the four shipped surfaces that today refuse — discovery card authors, feed postcard bylines, the published itinerary's traveler chrome, and the traveler dialog's "Visit profile" — all land on the real profile. After this ticket, no "coming soon" survives on any author tap.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] All four entry points navigate to `/travelers/{handle}`; the handle comes from the tapped payload's traveler card (always fresh — this is what makes a handle rename self-heal, per the spec's address-vs-identity ruling).
- [ ] Every "coming soon" refusal on those taps is deleted — the dead copy goes with it, not just the wiring.
- [ ] The traveler dialog's CTA works from the roster: member context in, public profile out.
- [ ] The Playwright entry-point sweep asserts **both halves** on each tap: the refusal is absent *and* the profile screen is present — a sweep that only checks the refusal's absence would pass on a dead tap.

## Comments

**2026-08-25 — the self re-ruling reaches this ticket** (spec Comments, C4 adopted): a tap on your **own** byline routes to the own Profile tab, never the public route — the wiring branches on subject-is-viewer, and the sweep asserts this fifth case alongside the four entry points (the refusal absent, the *Profile tab* present).
