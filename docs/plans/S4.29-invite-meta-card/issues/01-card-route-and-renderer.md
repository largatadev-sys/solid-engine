# 01 — The card route, live-rendered for a trip with a cover

**What to build:** A crawler (or anyone) fetching the trip's card image URL by join token receives the design's 1200×630 PNG rendered live from the trip's current data: cover photo center-cropped into the left panel with the seam gradient, and the right text column — wordmark, kicker, title, meta line, divider, brand bar — per the archived mock (frame 1, inviter line dropped). The renderer runs in-process in the join module, composing the teaser and the media display-variant bytes; the archived prototype (`../prototype/CardProto.java`) is the validated seed for the layout math, line-box model, wrap/clamp and tracking.

Scope guards for this slice: a trip **without** a cover serves the committed generic brand PNG for now (ticket 02 replaces that with the initials panel); DEAD handling beyond what the teaser already forces can wait for 02.

**Blocked by:** None — can start immediately.

**Status:** built and tested — the code ACs are closed; the demo-on-the-running-stack line waits on a rebuilt container at the story gate.

- [x] The card route answers a valid token with a PNG that decodes to exactly 1200×630 (spec decision 6; PNG, never JPEG)
- [x] Title renders in bundled Outfit 700 at 58px, stepping to 46px over ~30 characters, clamping at 3 lines with an ellipsis (frame 3 rule)
- [x] The meta line is the Java twin of the client's `tripMetaLine`/`compactDateRange` rule, with the client's test vectors duplicated verbatim in the twin's unit tests; no start date → destination alone (spec decision 9)
- [x] Fonts are bundled OFL resources (Outfit 700/800, Noto Sans 400/700) with whole-string fallback via canDisplayUpTo — no per-glyph work (spec decision 8)
- [x] Unknown token → 404 with no body worth caching
- [x] Response carries `Cache-Control: public, max-age=3600`; the existing token-scoped cover route's `private` header is corrected to `public` in the same slice (spec decision 3)
- [x] The version query (`?v=`) is accepted and provably ignored — same bytes with and without it
- [x] ITs in the join module's existing mould (singleton-Postgres base); pure math (wrap/step-down/clamp) unit-tested at the boundaries: exactly 30 chars, a word wider than the column, a 3-line overflow
- [ ] Demoable: curl the local stack's card URL for a seeded trip and open the PNG *(open: needs the rebuilt backend container. The renderer itself was eyeballed — four variants rendered to PNG and reviewed against the mock frames at build time — and `JoinCardIT` asserts the route end-to-end over real HTTP.)*
