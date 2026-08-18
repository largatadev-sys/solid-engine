# 02 — The update contract: merge-patch, owner-only, bulk relabel

Status: ready-for-agent

**What to build:** The itinerary update endpoint's new contract, provable entirely at the API seam. A second writer of trip details can exist safely because absent means keep and null means clear; only the owner edits details while collaborators keep the plan; changing the trip's currency relabels every priced activity in one transaction.

**Blocked by:** 01 — One destination and a Trip Currency in the model.

- [ ] Merge-patch matrix ITs, per field: absent = keep and explicit null = clear for description, best time of year, start date, end date, standouts; null title and null destination are refused as validation errors.
- [ ] The discriminating pair, one test: a collaborator's details edit is refused with the owner-act error while the same traveler's plan write (an activity edit) succeeds — code asserted, not just status (two 4xx-alike outcomes must be told apart).
- [ ] Trip currency on update is replace-only: absent keeps, explicit null refused. Changing it bulk-relabels every priced activity transactionally — an IT proves all-or-nothing (a forced mid-relabel failure leaves zero rows relabeled).
- [ ] The header edit lease is still required for details edits — asserted against the existing lease behavior, no new lease semantics.
- [ ] The mobile form contract emits explicit nulls for cleared fields (a blank date is a null, no longer an omission) and carries the currency; unit tests pin the emitted request shape.
- [ ] The publish contract still pins dates off the public wire (the named invariant: dates are workspace-private, duration is the public fact).

## Comments
