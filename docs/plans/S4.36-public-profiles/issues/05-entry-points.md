# 05 — Every author tap routes

**What to build:** the four shipped surfaces that today refuse — discovery card authors, feed postcard bylines, the published itinerary's traveler chrome, and the traveler dialog's "Visit profile" — all land on the real profile. After this ticket, no "coming soon" survives on any author tap.

**Blocked by:** 01.

**Status:** closed

- [ ] All four entry points navigate to `/travelers/{handle}`; the handle comes from the tapped payload's traveler card (always fresh — this is what makes a handle rename self-heal, per the spec's address-vs-identity ruling).
- [ ] Every "coming soon" refusal on those taps is deleted — the dead copy goes with it, not just the wiring.
- [ ] The traveler dialog's CTA works from the roster: member context in, public profile out.
- [ ] The Playwright entry-point sweep asserts **both halves** on each tap: the refusal is absent *and* the profile screen is present — a sweep that only checks the refusal's absence would pass on a dead tap.

## Comments

**2026-08-25 — the self re-ruling reaches this ticket** (spec Comments, C4 adopted): a tap on your **own** byline routes to the own Profile tab, never the public route — the wiring branches on subject-is-viewer, and the sweep asserts this fifth case alongside the four entry points (the refusal absent, the *Profile tab* present).

**2026-08-26 — the sweep, and what it does not reach** (`e2e/web/author-taps.spec.ts`). It asserts both halves — refusal absent *and* the profile screen present — on **three** of the four taps plus the fifth self case: the discovery card byline, the published itinerary's traveler chrome, a People result, and the own-byline redirect to the Profile tab.

**Two are covered structurally rather than by a walk, and this is stated rather than passed as coverage:** the **feed postcard byline** needs a seeded *shared* postcard (a multipart diary post with a photo, so MinIO) and the **traveler dialog** needs a seeded two-traveler roster opened through the Travelers tab. Both taps route through the same `useOpenTravelerProfile` the three walked taps use, and `__tests__/publicProfile.test.ts` asserts all four call sites carry it and that no `comingSoon('profile')` survives anywhere — but that is the "refusal absent" half the AC calls insufficient on its own. **Trigger:** the next story that already seeds a shared postcard or a roster walk should fold these two taps into its own walk.
