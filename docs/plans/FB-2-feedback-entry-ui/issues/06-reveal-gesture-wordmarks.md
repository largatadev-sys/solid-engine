# 06 — The reveal gesture on the two wordmarks

**What to build:** the five-rapid-taps reveal (spec decision 3). One pure tap-counter module
— five inside a rolling window, reset on a miss, clock injected at the call site (the S4.22
lesson on synthetic timestamps) — and one shared hook wrapping it, attached to exactly two
sites: the welcome screen's wordmark (signed-out) and the Home header's wordmark
(signed-in). The completed gesture always writes `'revealed'` — reveal, not toggle — so it
also resurrects a dismissed bubble. The wordmarks change neither appearance nor
accessibility semantics: the hook adds press handling to what is today static text, with no
visual difference and no button announcement to screen readers.

**Blocked by:** 02.

**Status:** ready-for-agent

- [ ] Counter module Jest: five-in-window reveals; four does not; a gap past the window resets the count; a sixth tap after reveal is inert
- [ ] Five taps on the welcome wordmark set `'revealed'` and the bubble appears; same on the Home header wordmark
- [ ] With the store at `'hidden'` (a dismissed bubble), the gesture brings it back
- [ ] Both screens render identically before and after, and neither wordmark is announced as a button
