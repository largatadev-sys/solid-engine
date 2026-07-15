# 02 — Backend: the authorization guard (`common/authz`, Full rigor — ADR-011)

**What to build:** The single chokepoint, in its permanent shape. `common/authz` gains the guard (`requireMember(travelerId, itineraryId) → Membership`), the `Membership` value type (role: `OWNER | MEMBER`), and the one-method `MembershipResolver` interface. The **itinerary module** provides the S0.3 resolver: owner match → synthesize `Membership{role: OWNER}`; anything else → empty, which the guard turns into the not-found rejection (404-masking, Artifact 05 — nonexistent and not-mine are byte-identical). E1 replaces the resolver with the workspace module's real one; guard, call sites, and service signatures must not change then.

**The structural guarantee is the deliverable:** itinerary service methods that touch a private itinerary take the resolved `Membership` as a parameter — uncallable without the guard having run. This is the pattern every later story imitates; it is why this ticket is Full rigor while the rest of the story is MVP-grade.

**Blocked by:** 01 — the resolver queries itinerary ownership.

**Status:** ready-for-agent

- [ ] Guard rejects (not-found semantics) on: nonexistent itinerary · existing itinerary, different owner — and the two rejections are indistinguishable
- [ ] Guard returns `Membership{OWNER}` for the owner; unit-tested against a stubbed resolver (no DB)
- [ ] `common/authz` depends on no module; the owner-based resolver lives in the itinerary module and is the only production `MembershipResolver`
- [ ] Workspace-scoped/private-read service methods require `Membership` as a parameter — verified by the Artifact 03 mechanical check: no itinerary-table query reachable outside the guard's flow
- [ ] No inline authority check anywhere in controllers or services (CLAUDE.md hard rule)

## Comments
