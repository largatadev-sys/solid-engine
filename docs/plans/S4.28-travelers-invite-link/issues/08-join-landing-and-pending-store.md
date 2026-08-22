# 08 — The /join landing + the pending-join store

**What to build:** the flagship flow — a link shared to a chat opens the postcard landing (frames 7a–7e), a stranger signs up through the full onboarding and is returned to the landing to request, and the whole thing survives process death. The app's first pre-auth screen.

**Blocked by:** 02 (the teaser, cover, and request endpoints).

**Status:** ready-for-agent

- [ ] The **join route** exists in no tab and no nav graph — reachable only by URL/deep link. The auth gate **admits the join segment unauthenticated** (the gate's destination logic changes; its Jest table grows the segment × auth-state rows).
- [ ] The **postcard** as drawn: one elevated card on the warm well — cover (via the token-scoped read; placeholder until loaded), "You're invited" kicker, title, "Destination · Dates · N travelers", the state's CTA inside the card; the wordmark above. Never an inviter line, roster names, or plan content; **no subtitles under the CTAs**. The card enters once as **one unit** (M7: fade + rise, 200ms ease-out — never element-by-element).
- [ ] **7a signed out**: "Sign in or create account" → the standard, **full** signup + onboarding (nothing trimmed — the founder's ruling), and the app returns here afterwards.
- [ ] **7b → 7c**: "Request to join" swaps to the quiet "Request sent" **in place** — a 150ms crossfade, no navigation; re-opening the link while pending lands on 7c. An unverified email on request reroutes to verify-code (the accept path's convention).
- [ ] **7d member/approved**: accent CTA "Open trip workspace" — no auto-redirect. **7e dead**: a valid token on an archived/published trip shows the dimmed teaser; an unknown token shows the generic postcard; both say "This trip isn't taking new travelers."
- [ ] The **pending-join store**, persisted (module-scoped + storage — never a screen's component state, and it must survive the OTP round trip and an app restart): opening the landing signed-out stashes the token; when the gate settles into the app it routes to the landing **instead of Home**, then clears. Jest covers stash → settle-route → clear, including a simulated restart.
- [ ] Exit behavior: the one-way door — 7d opens the workspace; otherwise back goes to Trips (signed-in) or the tab just closes (web). No approval "notification" is implied anywhere (the spec's canvas correction — the trip appearing in Trips is the discovery).
- [ ] Reduce Motion: M7 jump-cuts; the crossfade's opacity fade stays.
- [ ] Walked on the web rung end to end as the demo: share URL from ticket 06 → fresh browser context → 7a → sign up as a fresh `+suffix` pool identity → verified → returned to landing → request → approve as the owner → trip in Trips.
