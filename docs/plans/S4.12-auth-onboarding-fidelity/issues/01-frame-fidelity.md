# 01 — Frame fidelity: tagline, reveal icon, reset placement, completion glyph

**Status:** ready-for-agent

**What to build:** the four places where a screen shows something other than what its frame draws, with no ruling behind the difference. All four are founder-settled toward the frame (spec decisions 1, 2, 3, 6). No behaviour changes anywhere in this ticket — copy, one glyph, one alignment, and one affordance swapped from words to the icon beside them.

**Blocked by:** nothing.

- [ ] Welcome reads **"Plan less. Experience more."**; nothing else on the screen moves (spec decision 1, AC 1)
- [ ] The shared field component's trailing slot accepts an **icon** as well as text — one implementation, both auth screens as consumers (spec decision 2)
- [ ] Both auth screens render the **eye** glyph in the password field; tapping reveals and re-hides exactly as now; **the accessibility labels are unchanged** — "Show password" / "Hide password" (spec decision 2, AC 2)
- [ ] **"Forgot password?"** moves right-aligned under the password field at the frame's weight; empty-email inertness, the repository call and the notice line are all untouched (spec decision 3, AC 3)
- [ ] Completion renders **party-popper** — the glyph already exists and already renders on the published-trip screen (spec decision 6, AC 8)
- [ ] **`sparkle` leaves with it** — one consumer, so the path and its entry in the name union both go rather than lingering dead (spec decision 6, AC 8)
- [ ] **No colour literal introduced** anywhere under `mobile/` outside the token module (spec AC 10)

**Correction, found at implementation:** this ticket said *"the eye glyph is the only genuinely new asset in this story"*. **Wrong — `eye` already existed** in the icon module, as did `partyPopper`. **No glyph was authored.** The ticket was cheaper than written.

**And the completion swap was never a visual fix.** `sparkle` and `partyPopper` held **byte-identical path data** — the same nine paths under two names — so the completion screen was *already drawing a party popper*. The defect was an identifier that lied, plus a duplicated glyph. Weaker justification than the ticket gave it, stronger reason to do it: two names for one drawing is how a codebase drifts.

## Comments
