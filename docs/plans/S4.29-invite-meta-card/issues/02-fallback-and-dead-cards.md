# 02 — The fallback and dead cards

**What to build:** The two non-happy variants become real renders instead of the generic PNG. A trip with no cover renders frame 2: the tinted panel with the two decorative circles and the destination's initials (Outfit 800, 170px, 35% opacity) — initials via a Java twin of the client's `initialsFor` rule applied to the destination, with the client's vectors duplicated in its tests; an empty result draws circles only, never `'?'`, never a stock image. A DEAD link (trip published or archived) renders the "This invite link is no longer active" card at 200 — grace for links sitting in real threads. And the committed generic brand PNG becomes the *failure* fallback: any renderer exception serves it rather than a 500, so a crawler never sees a broken image.

**Blocked by:** 01 — the card route and renderer.

**Status:** ready-for-agent

- [ ] No-cover trip → frame 2 panel (circles at the mock's offsets, initials rule as specified); cover trip unchanged
- [ ] Initials twin unit-tested with the client rule's vectors verbatim; the all-punctuation destination case draws circles only
- [ ] DEAD token (published or archived trip) → 200 with the dead card; unknown token still 404 (spec decision 4)
- [ ] A forced renderer exception serves the committed generic PNG with a 200, never a 500
- [ ] ITs assert the three variants (cover / no-cover / dead) produce three distinct images
- [ ] Demoable: seed a coverless trip and an archived trip; curl both card URLs and eyeball the two variants
