# 02 — Backend: the authorization guard (`common/authz`, Full rigor — ADR-011)

**What to build:** The single chokepoint, in its permanent shape. `common/authz` gains the guard (`requireMember(travelerId, itineraryId) → Membership`), the `Membership` value type (role: `OWNER | MEMBER`), and the one-method `MembershipResolver` interface. The **itinerary module** provides the S0.3 resolver: owner match → synthesize `Membership{role: OWNER}`; anything else → empty, which the guard turns into the not-found rejection (404-masking, Artifact 05 — nonexistent and not-mine are byte-identical). E1 replaces the resolver with the workspace module's real one; guard, call sites, and service signatures must not change then.

**The structural guarantee is the deliverable:** itinerary service methods that touch a private itinerary take the resolved `Membership` as a parameter — uncallable without the guard having run. This is the pattern every later story imitates; it is why this ticket is Full rigor while the rest of the story is MVP-grade.

**Blocked by:** 01 — the resolver queries itinerary ownership.

**Status:** done

- [x] Guard rejects (not-found semantics) on: nonexistent itinerary · existing itinerary, different owner — and the two rejections are indistinguishable
- [x] Guard returns `Membership{OWNER}` for the owner; unit-tested against a stubbed resolver (no DB)
- [x] `common/authz` depends on no module; the owner-based resolver lives in the itinerary module and is the only production `MembershipResolver`
- [x] Workspace-scoped/private-read service methods require `Membership` as a parameter — verified by the Artifact 03 mechanical check: no itinerary-table query reachable outside the guard's flow
- [x] No inline authority check anywhere in controllers or services (CLAUDE.md hard rule)

## Comments

**2026-07-16 — implemented. The guarantee is real but narrower than ADR-011's prose implies — worth reading before S1.1.**

**The compiler refuted the first design.** `Membership` was written as a record with a package-private canonical constructor, so that "only the guard can mint one" would be enforced by visibility. Records forbid that (the canonical constructor cannot be weaker than the record's own access), and — more tellingly — the *second* compile error showed why the idea was wrong anyway: `OwnerMembershipResolver` legitimately constructs memberships, and the resolver seam means the producer always lives in whichever module owns the data, i.e. outside `common.authz` by construction. A closed constructor would have had to open.

**So the honest claim, now written into `Membership`'s javadoc:** the guard defends against **forgetting**, not against sabotage. A service method demanding a `Membership` cannot be called by a handler that never went through the guard — that is the default-by-omission failure Artifact 03 rejected per-service checks over, and against it a required parameter of a type you cannot obtain by accident is a complete defence. Code that *fabricates* a membership has decided to bypass authorization, which no signature prevents and which review catches on sight. ADR-011 says "a forgotten authorization check is a compile error"; that remains true. It does not say "unforgeable", and it should not.

**`view(Membership)` re-reads by `(id, ownerId)`, not by id alone** — belt and braces on the guard's own check, free because the composite index serves both. A mistakenly-constructed membership still cannot widen what is returned.

The 404-masking rule is asserted as an *indistinguishability*, not a status code: `ItineraryContractIT.anotherTravelerCannotSeeMyItineraryAndCannotTellItExists` compares the "not yours" and "no such id" bodies field by field. A 404-only assertion would pass against an implementation that leaked existence through the message.
