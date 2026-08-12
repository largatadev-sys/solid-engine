# 05 — The carousel

**What to build:** Multi-photo postcards page in place, per the mock's behavior card 1. Horizontal paged swipe snapping one photo per page, with the directional lock (the first ~10px of movement decides the axis; once horizontal, the feed's vertical scroll is dead until release, and vice versa), rubber-band ends with no wrap-around. Dots always visible, sliding window with shrinking edge dots past five; the n/N counter appears on swipe and fades after ~1.5s idle. Per-card page index survives the card recycling off-screen; only current ±1 images load. The web fork declines native paging and snaps on release (the S4.21 `pagingEnabled`/scroll-snap lesson — mandatory snap eats programmatic scroll). The page/slot math lives in a pure module both platforms share, Jest-covered (the pure-seam precedent — reanimated stays out of the test), including the negative-rounding asymmetry family.

**Blocked by:** 04 — Home lands on the feed.

**Status:** ready-for-agent

- [ ] On the real-touch rung (emulator browser at the 8083 rung, and the native walk): swipe pages one photo at a time, the lock holds both ways, ends rubber-band, no wrap (spec AC 8).
- [ ] Dots track the page with the ≤5 sliding window; the counter shows on swipe and fades idle; verify paging by counter and dot state, never child bounds (the S4.21 uiautomator lesson).
- [ ] Scrolling a card away and back restores its page index; only neighbours preload.
- [ ] The web driver drags via in-page PointerEvents (CDP mouse events don't synthesize them) and the drag moves; `getComputedStyle` shows no mandatory snap on the drag path.
- [ ] The pure math module's Jest suite covers page landing, window shrinking, and both swipe directions needing equal travel.
