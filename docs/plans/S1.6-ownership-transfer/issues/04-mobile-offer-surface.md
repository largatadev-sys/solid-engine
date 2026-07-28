# 04 — Mobile: the offer surface, both roles, and the discovery banner

**What to build:** the whole feature on glass. The owner offers from the Members screen and can retract; the trip announces the offer to the offeree the moment they open it; the offeree accepts or declines behind a confirm that names what they're taking on; the controls flip on the next roster read. Web behaves identically, proven in the container.

1. **Repository layer (ADR-001 — no raw fetch):** four mutations — offer, revoke, accept, decline — through the typed apiClient, plus `ownershipOffered` on the member model. Each mutation invalidates the roster query on success.
2. **`memberControls` (the S1.5 pure function) extended to the full matrix, Jest table alongside:** owner + no pending offer → Offer ownership on every non-self row · owner + pending → Revoke offer on the target's row, Offer nowhere (at-most-one-pending rendered as absence — don't-advertise-dead-ends) · offeree → Accept / Decline on their own row · everyone → the "Ownership offered" badge on the target's row. The decision lives outside the screen because a screen cannot be rendered under jest-expo (P8, S0.3) — which is exactly why S1.5 extracted this function.
3. **The discovery banner (spec decision 8):** the trip screen shows *"You've been offered ownership of this trip"* → navigates to Members — driven by the same roster query the Members screen uses (bounded, cached, no new endpoint). This banner is the offer/accept reversal made real: without it the discovery guarantee that won the design argument is one screen deep. Only the offeree sees it.
4. **Confirms:** all four acts through the platform-forked `confirmWith`; wording in the shared module so the platforms cannot drift (S1.5's pattern). Copy decided at this ticket, with the spec's constraints: accept names the authority gained (you become the only one who can remove members, transfer ownership, delete the trip); offer names what acceptance will cost the owner. Danger styling on none of them — nothing here destroys; these confirm authority movement.
5. **Web parity:** the shared codebase renders both roles' controls and the banner in the browser; verified in the preview container (true build path), with `window.confirm` CDP-intercepted — the S1.3 Alert-no-op lesson means "renders on web" proves nothing about dialogs.
6. **Tests:** the `memberControls` Jest table covers every cell of the matrix, including the flip after a transfer (feed it post-accept roster data, assert the ex-owner's row shows Leave and the new owner's shows Remove) · banner visibility decided by a pure predicate with its own tests (offeree yes, owner no, uninvolved member no) · mutation wiring tests per the repository layer's existing pattern.

**Blocked by:** 01 — Offer lifecycle · 02 — Accept executes the transfer. *(Does not need 03 — the banner and controls ride the roster, not the list.)*

**Status:** done

- [x] Owner: Offer ownership on non-self rows; while pending — badge + Revoke on the target's row, Offer nowhere else
- [x] Offeree: badge + Accept / Decline on own row; trip screen shows the discovery banner; tapping it lands on Members
- [x] All four acts confirm via `confirmWith`, shared wording, cancel leaves state untouched
- [x] After accept: controls flip on the next roster read — ex-owner gains Leave, new owner gains Remove/Offer
- [x] `memberControls` Jest table green for the full matrix; banner predicate tested; no raw fetch anywhere (ADR-001)
- [ ] Web preview container: both roles driven with CDP-intercepted confirms, cancel and confirm paths both (feeds spec AC 13) — **runs at ticket 05**, with the other two rungs
