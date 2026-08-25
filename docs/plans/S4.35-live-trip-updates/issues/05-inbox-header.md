# 05 — The inbox header: an invitation arrives while you watch

**What to build:** someone invites you by handle and the invitation appears in the Trips inbox header without a refresh. `InvitationInbox` is the `ListHeaderComponent` of the Trips list — this is not a separate surface, it is the top of the screen the founder named.

**Blocked by:** 03.

**Status:** closed

- [x] The handle-invitation issue path raises `invitation.received` with a payload, addressed to the **recipient**, absorbed into the cached inbox. Zero queries.
- [x] The existing inbox response already carries what the event absorbs — confirm rather than assume, and add **no `/v1` change**.
- [x] The invite-link path is untouched: a link join produces a **Join Request**, not an invitation, and lands via ticket 04's `membership.granted` on approval. Do not conflate the two doors — they have different consent semantics (ADR-032).
- [x] A revoked or expired invitation does not resurrect through absorb; the absorbed row respects the same visibility the REST read applies.
- [x] Playwright, two contexts: t2 invites t1 by handle while t1 sits on Trips; the header changes with no refresh gesture.

**2026-08-25, implementation — closed.** `invitation.received` carries the **whole inbox row** the REST read returns — `InboxTopic` reuses `InvitationService.inboxCardOf`, so the absorbed row and the fetched row cannot drift by construction. The client absorbs it at the top of the cached inbox, de-duplicated by id; `live-trips.spec.ts`'s *"an invitation lands in the inbox header with no refresh"* proves it end to end.

**The invite-link path is untouched, as the ticket required:** a link join produces a Join Request and lands via ticket 04's `membership.granted` on approval. Only `inviteByHandle` raises this event.

**One ordering consequence worth keeping:** issuing an invitation and accepting it are now two events on one act, so `invitation.received` arrives **before** `membership.granted` on the admit path. Three ITs had assumed one act raises one frame and read only the next one; `WsTestClient.awaitFrameContaining` now finds the frame under test. A test that asserts an ordering nobody promised is a test that will fail on the next event added.
