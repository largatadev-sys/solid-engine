# 10: `itinerary` takes the proofs — publish and unpublish through `Writable<Owner>`, preview through `InAudience<Owner>`

**What to build:** the itinerary module's three owner acts on the trip take their doors. Publish and unpublish are owner-only writes that must survive a live publication (unpublish *is* the thaw) but not a closed room, so they take `Writable<Owner>`, minted as `fence.writable(Owner.of(m, refusal))` with the two messages the service names today. Preview is an owner-only read: `InAudience<Owner>`. The editing-session check publish makes (refusing while another traveler holds the session) stays where it is, reading through the plan-contract method ticket 02 gave it. The publication port's implementation in this module is untouched. No direct call to the old doors remains in `itinerary`. Behaviour-neutral: same codes, same messages, role before state. Spec decisions 8, 9; grilling Q13, Q14.

**Blocked by:** 03.

**Status:** ready-for-agent

- [ ] Publish and unpublish take `Writable<Owner>`; preview takes `InAudience<Owner>`; no method in the itinerary module's trip-facing service takes a bare `Membership`
- [ ] The itinerary module imports neither `WriteFence` nor `AudienceFence`
- [ ] A member's publish answers *only the trip owner can publish this trip*; an owner's publish of an archived trip answers `ITINERARY_NOT_FOUND`; unpublish on a live publication succeeds — the publication ITs pass **unedited** except where role-before-state changes which refusal a member hears, each listed by Q14
- [ ] Scoped `itinerary` ITs and the unit suite green; CI green on push

## Comments

*None yet.*
