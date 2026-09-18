# 09: `join` takes the proofs — requesting through `Unfrozen` with the link's own refusal, the queue through `MembershipMutable<Owner>`

**What to build:** the join module's acts take their doors, and its one hand copy of *both* facts folds into the fence and the archived set. Requesting to join is an act by a **non-member**, so it takes `Unfrozen`, minted by trip id through the refusal overload with the module's own `JOIN_LINK_CLOSED`; the teaser's *closed* answer is `archived || published`, and after this ticket the published half comes from the fence while the archived half stays a reader-side consult of the trip module's archived set (ticket 05's scope names the teaser). Reading the queue and answering a request are owner-only roster changes: `MembershipMutable<Owner>`, minted as `fence.membershipMutable(Owner.of(m, refusal))` with the two owner messages the unified refusal class now carries (ticket 03). Sharing the link and reading it as a member take `InAudience`. No direct call to the old doors or to `PublicationState` remains in `join`. Behaviour-neutral. Spec decisions 8, 9, 11; grilling Q7, Q15.

**Blocked by:** 03.

**Status:** ready-for-agent

- [ ] Request-to-join takes `Unfrozen` minted with `JOIN_LINK_CLOSED`; queue read and answer take `MembershipMutable<Owner>`; link share and member read take `InAudience`; no method in the join module takes a bare `Membership`
- [ ] The join module imports neither `WriteFence`, `AudienceFence` nor `PublicationState`, and holds no owner-refusal class of its own
- [ ] The teaser answers closed for an archived trip and for a published one; a request on a published trip answers `JOIN_LINK_CLOSED`; a non-owner reading the queue hears *only the trip owner can see who has asked to join* — the join ITs pass **unedited** beyond import lines
- [ ] Scoped `join` ITs and the unit suite green; CI green on push

## Comments

*None yet.*
