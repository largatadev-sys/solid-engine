# 04: `trip` takes the proofs — every act in the trip module demands its door in its signature

**What to build:** the largest migration batch, mechanical and behaviour-neutral. Every service method in the trip module that sits on a fenced surface stops taking a bare `Membership` and takes the proof its door mints: the plan slice's writes, the editing session's acquire and release-by-holder, and the plan save take `Editable`; the lifecycle transitions take `Editable<Owner>`; the photo dump's list takes `InAudience` and its upload `Writable`; the ownership slice's roster changes take `MembershipMutable`, the owner-only ones `MembershipMutable<Owner>`; the cover, history and facts reads take `InAudience`; **archive, unarchive and destroy take `Owner` alone** — they must reach a closed room — and self-leave keeps a bare `Membership` by S1.9's rule. Controllers mint the proof — `fence.editable(Owner.of(m, refusal))` — and pass it; the acts read the standing from the proof and keep their own role predicates where the rule is owner-*or*-someone (the dump's uploader-or-owner). No direct call to the old doors remains in `trip`. Role is now checked before state by construction. Spec decision 9; grilling Q13, Q14.

**Blocked by:** 03. *(Run after 01 as well so `TripService` is touched once, but 01 does not gate it.)*

**Status:** ready-for-agent

- [ ] No method in the trip module's services on a fenced surface takes a bare `Membership` except self-leave; archive, unarchive and destroy take `Owner`; the mapping above holds for every slice
- [ ] No production class in `trip` calls `WriteFence` or `AudienceFence`
- [ ] Every owner-only act's refusal renders the same code and message as before, through `Owner.of` with that act's factory
- [ ] The trip module's ITs pass **unedited** except where role-before-state changes which refusal a *member* hears on a published trip's owner-only act — each such change listed on this ticket by Q14
- [ ] Scoped `trip` ITs and the unit suite green; CI green on push

## Comments

*None yet.*
