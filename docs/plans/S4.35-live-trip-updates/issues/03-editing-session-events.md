# 03 — The editing-session events reach the Trips card *(the tracer bullet)*

**What to build:** the founder's named example, end to end. t1 is sitting on Trips; t2 taps Edit Itinerary on a shared trip; **t1's "being edited by…" card appears while t1 is looking at it**, with no refresh and no navigation. t2 leaves the editor and the card clears.

**Blocked by:** 02.

**Status:** ready-for-agent

- [ ] `EditLeaseService` raises `editing-session.acquired` and `editing-session.released` through the existing `AfterCommit` seam, fanned onto the trip's topic. A rolled-back acquisition broadcasts nothing (the AFTER_COMMIT pair, IT-proven).
- [ ] Both carry a **payload**, absorbed straight into the cached trip — **zero queries**. `ItineraryResponse` already carries `beingEdited`, `lease`, `editingSession` and `lastEditedBy*`, so the fields have somewhere to land and **no `/v1` change is needed**; confirm that rather than assume it.
- [ ] The client's **event dispatch table** is built here — type to handler, with **unknown types ignored silently** (ADR-030's tolerance rule). Tickets 04–06 add rows to it; they do not each invent a dispatcher.
- [ ] The traveler-topic subscription is held **once, at the root**, beside `useSocketLifecycle` — for the app session, not per screen. Focus governs what the client *does* with events, never whether it is listening; a focus-scoped subscription would re-run the membership resolution on every tab switch, which is a query per navigation.
- [ ] Absorb functions are pure and Jest-tested — given a cached page and an event, the resulting page (the `absorbIntoThreadCache` precedent). **No component rendering**; importing screens pulls reanimated's native init.
- [ ] Playwright, two browser contexts: t1 on Trips, t2 acquires and releases. Asserted **at the socket and at the render** — a frame that arrives and a card that moves are two claims. Sabotage-verified by breaking the broadcast.
