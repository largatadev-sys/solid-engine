# 07 — The stale refusal and lapsed-session saves

**What to build:** The save flow's hard cases, traveler-facing. A session lapse mid-edit keeps the editor and the buffer (the renewal-failure alert stays informational — nobody is kicked out holding unsaved work); Save Changes attempts re-acquire, then version-checks. A stale base surfaces the two-choice refusal (spec decisions 4/5): "This plan changed while you were away" — **Discard my changes** (drop the buffer, reload the current plan, stay in the editor) or **Save anyway**, the visually quieter control, which re-submits against the refusal's current version — explicit, attributed, race-safe. Dismissal keeps editing. A foreign holder at save gets the existing edit-locked refusal with the buffer kept. No merge UI — live-editing territory, parked.

**Blocked by:** 05 — the editor stages (the save flow these refusals ride).

**Status:** ready-for-agent

- [ ] A lapsed session mid-edit leaves the traveler in the editor with the buffer; Save re-acquires when the session is free and proceeds through the version check.
- [ ] The stale refusal renders both choices with Save anyway visually quieter; dismissal keeps editor and buffer.
- [ ] Discard reloads the other writer's plan, drops the buffer, stays in the editor with a clean state.
- [ ] Save anyway lands the staged plan against the refusal's current version; the intervening edit is gone; history attributes the final save to the saver (spec AC 5's client half).
- [ ] A foreign holder at save surfaces the edit-locked refusal naming the holder, buffer kept, editor stays.
- [ ] The dialog is driven on the web rung with both choices observed working (the S4.20 confirm-stub prints the wording); the deterministic stale sequence itself is proven at the IT seam under the controlled clock (ticket 02) — the walk drives the UI, the IT proves the mechanism.
