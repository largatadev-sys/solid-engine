# 02 — The bulk save endpoint

**What to build:** One transactional act that replaces the whole plan document: `PUT /v1/itineraries/{id}/plan` takes the base `planVersion` plus the full desired day/activity structure and reconciles by id — present-with-id updates, id-less creates, absent deletes, array order is the order (a same-id day change is expressible; no client stages one at S4.18). Holder-only: the caller must hold the Editing Session. Version-checked: a stale base refuses with a new named stale-plan code carrying the current version, so a client can offer the explicit re-based overwrite (spec decision 5) without any force flag — one endpoint semantic. All-or-nothing: any failure leaves the plan untouched — the half-saved plan is the bug buffering exists to prevent. Additive under ADR-008; every per-action endpoint stays live.

**Blocked by:** 01 — the plan version (the check reads it; the save bumps it).

**Status:** done

- [x] A mixed-op save (day added, day renamed, day deleted, activity created, activity edited, activity deleted, a reorder) lands in one call; a fresh read shows exactly the submitted plan and a bumped `planVersion` (spec AC 2's server half).
- [x] A stale base refuses with the named stale-plan code and the current `planVersion` in the refusal; re-submitting with that version succeeds — the explicit-overwrite path, proven at the IT seam under the controlled clock (spec AC 5's server half: stage → lapse → second writer saves → stale base refused).
- [x] A non-holder is refused with the existing edit-locked code; archived and published trips refuse through the existing fence codes — the bulk path inherits the whole write regime.
- [x] Transactionality proven: a save that fails validation partway (e.g. one malformed activity among valid ops) changes nothing — no partial days, no partial deletes, version unbumped.
- [x] Controller ITs ride the S4.9/S4.17 lease-suite prior art — external behavior only: wire responses and named refusal codes, never lease-row internals (spec testing decisions).
