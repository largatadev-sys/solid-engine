# 04 — Backend: analytics seam + register #2 default events

**What to build:** `analytics.emit(name, attributes)` in `common` — the seam is the asset (call sites accrete per story; the sink is swappable plumbing). v1 sink: one structured JSON log line per event on a dedicated `analytics` logger, mechanically distinguishable from app logs. Emission is post-commit and fire-and-forget — an analytics failure can never fail the user action. Events: **`itinerary_created`** (`travelerId`, `itineraryId`, `hasDates`, `destinationCount`) from the itinerary logic layer, and **`traveler_signed_up`** as one line in S0.2's existing provisioning path. Durable sink is deliberately deferred — epic-map trigger: before alpha, with registers #1/#2.

**Blocked by:** 03 — the create path is the first call site.

**Status:** ready-for-agent

- [ ] `itinerary_created` line appears on the `analytics` logger with exactly the four attributes; emitted after commit
- [ ] **No user text ever**: asserted that title/destination content does not appear in the event line (P3 extended to analytics)
- [ ] A throwing sink does not fail or delay the create (fault-injection test)
- [ ] `traveler_signed_up` emitted on first provisioning only — not on subsequent sign-ins
- [ ] Rolled-back create emits nothing

## Comments
