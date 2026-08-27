# 04 — Trips swipe + Leave

**What to build:** a traveler drags a Trips-screen card left and a 96px action panel reveals behind it — filled danger + **Delete** on a trip they own, secondary + **Leave** on a trip they're a member of, chosen from the listing's `viewerRole`. The gesture follows the handoff exactly: 4px engage threshold so taps still land, 12px overdrag, snaps open past half at 220ms, one card open at a time, tab switches close it, pointer capture so the drag survives leaving the card. On first arrival the top card peeks −14px once per session; Reduce Motion skips the peek. **Leave ships end to end in this slice:** tap Leave → no modal → row collapses → 5-second undo toast (the trips pill variant, lifted above Plan a Trip on Upcoming) → the membership DELETE is deferred behind the toast; undo means it is never sent. Owner's Delete tap is wired to open nothing yet (ticket 05 lands the modal) — it must not archive or fake anything in this slice.

**Blocked by:** 01 (the toast kit) · 03 (viewerRole — resolved).

**Status:** ready-for-agent

- [ ] The swipe math (clamp, threshold, snap decision) is a pure module with Jest, shared by both platform forks; the shipped Trips screen is not restyled.
- [ ] Owner rows reveal Delete, member rows reveal Leave, never both (Playwright, two pool travelers — state the tags).
- [ ] Leave: collapse → undo toast → nothing on the wire on undo; expiry sends exactly one membership DELETE; "Left the trip" / "You are back in the trip" from the copy module.
- [ ] One open card at a time; tab switch closes it; the peek fires once per session and not under Reduce Motion.
- [ ] The trips toast lifts to clear Plan a Trip on Upcoming only.
