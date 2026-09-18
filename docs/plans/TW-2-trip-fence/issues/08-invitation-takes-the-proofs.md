# 08: `invitation` takes the proofs — issuing and revoking through `MembershipMutable`, accepting through `Unfrozen`, the pending list through the fence in its own words

**What to build:** the invitation module's three shapes of act each take the proof of the door they pass. Issuing by handle and revoking a pending invitation take `MembershipMutable` — any member may (ADR-032's policy), so the standing is `Membership`. Accepting an invitation is an act by a traveler who is **not yet a member**, so it takes `Unfrozen`, minted by trip id from the fence — the `MEMBERSHIP_FROZEN` refusal on a published trip exactly as today. The pending-invitations read, which refuses on a published trip with the module's own answer, takes its freeze from the fence through the refusal overload with that same answer. The hand copy — the `isPublished` check inside the service — is deleted; the module reads neither `PublicationState` nor the old doors afterwards. The archive-time voiding of invitations (the `TripArchived` listener) is untouched. Behaviour-neutral. Spec decisions 8, 9; grilling Q7.

**Blocked by:** 03.

**Status:** ready-for-agent

- [ ] Issue and revoke take `MembershipMutable`; accept takes `Unfrozen`; the pending-list read takes a proof minted with the module's own refusal; no method in the invitation module takes a bare `Membership`
- [ ] The invitation module imports neither `WriteFence`, `AudienceFence` nor `PublicationState`
- [ ] Accepting on a published trip answers `MEMBERSHIP_FROZEN`; issuing on an archived trip answers `ITINERARY_NOT_FOUND`; the pending list on a published trip answers exactly what it answers today — the invitation ITs, `InvitationExpiryIT` included, pass **unedited** beyond import lines
- [ ] Scoped `invitation` ITs and the unit suite green; CI green on push

## Comments

*None yet.*
