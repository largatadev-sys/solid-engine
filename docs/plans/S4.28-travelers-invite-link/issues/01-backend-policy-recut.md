# 01 — Backend policy re-cut: any-member invites + the publish freeze

**What to build:** ADR-032's three policy changes on the **existing** wire — no new endpoints. A member (not just the owner) can issue a handle invitation and revoke a pending one; every membership mutation and ownership-offer operation refuses on a published trip; leave keeps working everywhere. All three are shipped-/v1 semantics changes riding ADR-032's waiver.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Invitation issuance (email + handle endpoints) and revocation authorize **any member** via the guard's resolved Membership; the owner-only refusal disappears from these two paths and nowhere else.
- [ ] The publish freeze, with a **named, distinguishable** refusal code on each door: invitation issue, revoke and **accept** · member removal · ownership offer, revoke-offer, accept-offer, decline-offer — all refuse while the trip is published. Reuse the existing editable-fence ladder only if its refusal code is the one the client should see (the S4.10 `CHAT_CLOSED` lesson: a fence that compiles with the wrong name ships the wrong refusal).
- [ ] **Leave is untouched**: a non-owner leaves a published trip and an archived trip (both proven by IT — S1.9's self-leave-survives canon).
- [ ] **Completed-but-unpublished stays fully open**: invite, remove, offer all succeed (IT) — the post-trip-add use case.
- [ ] Pending invitations on a published trip go inert and invisible: the inbox excludes them, accept refuses with the named code; unpublish brings them back if unexpired (IT both ways).
- [ ] ITs at the HTTP seam: the **policy matrix** (member invites 201 / member revoke 204 / member remove refused by name / member approve-offer paths unchanged) and the **freeze matrix** (every door above, published vs completed-unpublished). Every assertion names the discriminating code, never bare status.
- [ ] Existing analytics events unchanged; `invited_by` attribution keeps working when a non-owner invites.
- [ ] Guard/fence coverage sweeps still pass and still scan every touched handler.
