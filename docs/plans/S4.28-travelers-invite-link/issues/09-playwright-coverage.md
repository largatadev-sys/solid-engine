# 09 — Playwright coverage

**What to build:** the story's specs in the H1 suite, both projects — the flows a runner can prove, leaving the device rung only what no runner reaches (motion fidelity, the real share sheet).

**Blocked by:** 03, 06, 07, 08.

**Status:** ready-for-agent

- [ ] **Travelers walk** (web project): owner invites by exact handle through the sheet → ghost pill → the row lands in Invited → revoke as a *different* member (the any-member policy on the surface) → the row exits. Tags stated in the spec's write-up (t1 = owner, t2 = revoking member).
- [ ] **Requests walk**: a request seeded over the API (the join module), the owner's Requests section renders it, Approve moves the traveler into the roster; a second seeded request Declined disappears silently.
- [ ] **Landing states** (web project — /join lives on this rung today): fresh browser context per state; 7a signed out (teaser fields present, roster/plan absent from the DOM) · 7b signed in → request → 7c in place · 7c on re-open · 7d as a member · 7e for an archived trip's token and for a garbage token.
- [ ] **Transfer walk**: t1 offers t2 through the ⋯ menu → t2's offer card renders → accept → "Trip owner" sub swaps on both viewers' tabs; the revoke and decline branches asserted.
- [ ] **Inbox card**: invite t3 by handle → t3's Trips shows the context card (cover, "Invited by", expiry line) → Accept lands in the workspace; a second invitation Declined through the confirm.
- [ ] **Published freeze on the surface**: a published trip's Travelers tab shows no add bar, no Invited/Requests, ⋯ only on the viewer's own row.
- [ ] Suite conventions held: dialogs auto-accepted with wording printed, role-based locators, skipped-vs-failed distinguishable, one suite at a time per stack. The specs run in the merge-gate CI job (ADR-031) — read the run there, never re-run locally out of ritual.
