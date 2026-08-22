# 03 — The invitation inbox context card, end to end

**What to build:** frame 6 whole — the handle-invitation card on the Trips tab gains trip context before commitment: cover, destination and dates, who's going, who invited, expiry, and an asymmetric Accept / Decline-with-confirm. Backend enrichment and client rebuild in one vertical slice, demoable by inviting a pool traveler and looking at their Trips tab.

**Blocked by:** None — can start immediately (parallel lane; touches neither the policy re-cut nor the join module).

**Status:** ready-for-agent

- [ ] Additive fields on the inbox payload: destination, date range, cover reference, **inviter handle**, and a going-preview (the first few accepted-member summaries + total count — accepted only, per C5).
- [ ] The **invitation-scoped cover** read: thumbnail variant, authorized by being the invitee (the audience fence correctly refuses a not-yet-member — the invitation is the capability; the ADR-032 exemption family). Coverage-sweep exemption qualified by controller + reason.
- [ ] The pending-invitations payload gains the inviter's handle; email-born rows are recognizable to the client (no invitee handle/id) — the address itself is never needed by any renderer.
- [ ] **Expired invitations render nowhere**: the server filters them from the inbox and from the pending list; re-inviting mints a fresh row (ITs both lists).
- [ ] The card rebuilt to frame 6: cover (placeholder well until loaded) · title · "Destination · Dates" · facepile (photo avatars, tinted-initials fallback, white ring, overlap; **200ms spring pop, 40ms stagger** — M6) · "Invited by @handle · Nd ago" · expiry line (muted; **destructive tint under 48h**).
- [ ] **Accept**: accent pill with in-pill spinner (as coded today), navigate into the workspace, card exits via M2; the `EMAIL_NOT_VERIFIED` → verify-code reroute stays.
- [ ] **Decline**: quiet text behind the platform alert with the canvas's exact copy ("@handle won't be notified. They can invite you again."); card exits via M2.
- [ ] Reduce Motion: facepile pop and M2 close jump-cut; opacity fades stay.
- [ ] Jest at the pure seams: expiry label + the 48-hour switch (clock injected — never `Date.now()` inside the module under test on the web fork, the S4.22 timestamp trap) · card state assembly. ITs: field enrichment, expired filtering, cover authorization.
