# 01 — Palette + front-door restructure

**Status:** ready-for-agent

**What to build:** the app re-skinned in the brand palette (ADR-016), and the new auth front door: a traveler opening the app lands on the welcome screen (hero, Create Account / Sign In), and each button leads to its own screen — sign-up and sign-in — both carrying the official Google button under the email fields. Verification stays the existing link mechanism for now (ticket 02 replaces it); the flow after authentication is unchanged. A cold visit no longer fires an unauthenticated trips request before auth resolves.

**Blocked by:** None — can start immediately.

- [ ] Palette + Inter applied as a values-only token swap; no screen hardcodes a color; Inter loads on native and web (spec decision 10)
- [ ] Before/after screenshots (device + preview) captured for founder review (spec AC 12)
- [ ] Welcome screen: hero image treatment, wordmark, tagline, Create Account / Sign In per the wireframe — no ToS line (spec decision 9)
- [ ] Sign-up and sign-in are separate screens, each with the Google button ("or continue with Google"); the cross-links ("Already have an account?" / "Create an account") work (spec decision 3)
- [ ] Existing auth still green: email sign-in, email sign-up (old link verification), Google sign-in on device and web preview — no regression while the door is rebuilt
- [ ] Cold visit fires no unauthenticated `GET /v1/itineraries` before auth resolves, asserted via the preview driver's network log (spec decision 13, AC 11)
