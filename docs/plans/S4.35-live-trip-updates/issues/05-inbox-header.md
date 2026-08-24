# 05 — The inbox header: an invitation arrives while you watch

**What to build:** someone invites you by handle and the invitation appears in the Trips inbox header without a refresh. `InvitationInbox` is the `ListHeaderComponent` of the Trips list — this is not a separate surface, it is the top of the screen the founder named.

**Blocked by:** 03.

**Status:** ready-for-agent

- [ ] The handle-invitation issue path raises `invitation.received` with a payload, addressed to the **recipient**, absorbed into the cached inbox. Zero queries.
- [ ] The existing inbox response already carries what the event absorbs — confirm rather than assume, and add **no `/v1` change**.
- [ ] The invite-link path is untouched: a link join produces a **Join Request**, not an invitation, and lands via ticket 04's `membership.granted` on approval. Do not conflate the two doors — they have different consent semantics (ADR-032).
- [ ] A revoked or expired invitation does not resurrect through absorb; the absorbed row respects the same visibility the REST read applies.
- [ ] Playwright, two contexts: t2 invites t1 by handle while t1 sits on Trips; the header changes with no refresh gesture.
