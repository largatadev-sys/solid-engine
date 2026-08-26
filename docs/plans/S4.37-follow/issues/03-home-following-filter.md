# 03 — Home: the All / Following filter

**What to build:** the chip row under the Home header and the narrowed feed behind it — canvas frames 3/3b, semantics per C6. "Only on Home" is a founder ruling: Discover, People ranking and the feed cards are untouched.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] **The feed endpoint gains one additive query parameter** (`scope=following`): present → only postcards whose author the viewer follows, filtered in the WHERE clause (the S4.3 precedent — never post-filtered in the client); absent → today's behavior byte-for-byte, and an IT pins that.
- [ ] **The chip row per frame 3:** All (default) · Following — height 32, radius 999, 13/700; active filled #EA580C white, inactive white + 1px #E7E5E4 border #57534E. M3 chip switch; incoming panel fade + 8px rise; outgoing removed, never overlapped; M4 Reduce Motion.
- [ ] **C6 semantics:** cold start always lands on All; the selection lives in app memory only — never persisted. The retap-to-refresh and focus-freshness behavior (S4.34) applies to whichever scope is active; the new-posts pill keeps working on both.
- [ ] **The Following empty state per frame 3b**, copy byte-for-byte: "No postcards yet" / "Postcards from travelers you follow will show up here." + the **Find people** CTA into People search. One state covers following-nobody and follows-with-no-posts.
- [ ] **Feed cards unchanged** under either chip — the canvas's likes row is a named non-shipping deviation (digest); a structural test pins that `FeedCard` renders identically for both scopes.
