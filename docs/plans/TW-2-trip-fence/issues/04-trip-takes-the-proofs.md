# 04: `trip` takes the proofs — every act in the trip module demands its door in its signature

**What to build:** the largest migration batch, mechanical and behaviour-neutral. Every service method in the trip module that sits on a fenced surface stops taking a bare `Membership` and takes the proof its door mints: the plan slice's writes, the editing session's acquire and release-by-holder, and the plan save take `Editable`; the lifecycle transitions take `Editable<Owner>`; the photo dump's list takes `InAudience` and its upload `Writable`; the ownership slice's roster changes take `MembershipMutable`, the owner-only ones `MembershipMutable<Owner>`; the cover, history and facts reads take `InAudience`; **archive, unarchive and destroy take `Owner` alone** — they must reach a closed room — and self-leave keeps a bare `Membership` by S1.9's rule. Controllers mint the proof — `fence.editable(Owner.of(m, refusal))` — and pass it; the acts read the standing from the proof and keep their own role predicates where the rule is owner-*or*-someone (the dump's uploader-or-owner). No direct call to the old doors remains in `trip`. Role is now checked before state by construction. Spec decision 9; grilling Q13, Q14.

**Blocked by:** 03. *(Run after 01 as well so `TripService` is touched once, but 01 does not gate it.)*

**Status:** done

- [x] No method in the trip module's services on a fenced surface takes a bare `Membership` except self-leave; archive, unarchive and destroy take `Owner`; the mapping above holds for every slice
- [x] No production class in `trip` calls `WriteFence` or `AudienceFence`
- [x] Every owner-only act's refusal renders the same code and message as before, through `Owner.of` with that act's factory
- [x] The trip module's ITs pass **unedited** except where role-before-state changes which refusal a *member* hears on a published trip's owner-only act — each such change listed on this ticket by Q14
- [x] Scoped `trip` ITs and the unit suite green; CI green on push

## Comments

**Closed 2026-09-18.** Every act in the trip module now demands its door in its signature, and no production class in `trip` calls `WriteFence` or `AudienceFence`.

**The mapping, as built.** Plan writes, the editing session's acquire/renew/require and the plan save take `Editable`; `appendDay`/`deleteDay` take `Editable<Owner>` (they were owner-only already, via a private `requireOwnerOfWritableTrip` that is now deleted); lifecycle `start`/`complete` take `Editable<Owner>`; the photo dump's list takes `InAudience` and its upload/remove `Writable`; the ownership slice's owner-only acts take `MembershipMutable<Owner>` and accept/decline `MembershipMutable`; **archive, unarchive and destroy take `Owner` alone**; self-leave keeps its bare `Membership` (S1.9), and `release` keeps one too — a holder must be able to let go of a lock on a deleted trip, which `ArchiveWriteFenceIT` pins.

**`EditLeaseService` was the chokepoint and migrating it first did most of the work.** Five `requireEditable` calls sat behind every plan write, so once the lease service demanded `Editable` the compiler walked the requirement outward to fifteen call sites by itself. The service no longer *holds* a fence at all — its field is gone. That is the shape the story wanted: a service that cannot check, only demand.

**`reopen` keeps `Writable<Owner>` and its own publication check, deliberately.** `Editable` would have refused first with `ITINERARY_PUBLISHED`, but `PublishedMeansALiveItineraryIT` pins `ILLEGAL_STATE_TRANSITION` there — a published trip's *lifecycle* is pinned, which is a different rule from the plan freeze and has its own wire code. Changing it was never grilled, so it did not change.

---

### A real defect the migration surfaced, and the fix

Minting `Owner.of(member, …)` as the argument gives role-before-state for free — but on a **deleted** trip that inverted the mask: a member attempting an owner-only act got `403 NOT_PERMITTED`, which tells them the trip exists. Three ITs caught it.

Re-reading the grilling settles it: **Q14's question is scoped to a published trip** — *"which refusal a member gets on a **published** trip's owner-only act"* — and Q11 is unambiguous that a deleted trip is not found for everyone. Both rules hold at once; they are about different states.

The fence gained a door for exactly that: **`fence.owner(member, refusal)`** checks the room, then mints the `Owner`. So an owner-only act on a visible trip still refuses by role first (Q14), and on a deleted one the mask is outermost (Q11). Every owner-only call site routes through it; the three that deliberately do **not** are `archive`, `unarchive` and `destroy`, which must reach a closed room by design. Two new fence tests pin both halves.

**One further code change, and it is an improvement rather than a regression.** Accept/decline of an ownership offer on a deleted trip answered `OFFER_NOT_FOUND` (the offer having been voided at archive) and now answers `ITINERARY_NOT_FOUND` (the mask, reached first). Both are 404, so nothing a traveler sees moves, and the mask is the more correct of the two — a member should not learn an offer ever existed on a trip they cannot see. The test is renamed to say what it now proves.

---

**`AudienceFenceCoverageTest` was taught the new door.** It recognised `requireInAudience` as proof that a workspace-scoped GET is fenced; controllers now call `fence.inAudience(...)`, so it recognises both. Without that it would have failed on handlers that are *more* fenced than before — a guard going red because the thing it guards got better.

**Test-side proofs go through one helper.** `support/Proofs` wraps the fence with `editable`/`writable`/`inAudience`/`mutable` and their `…Owner` variants, so the ITs that drive services directly mint proofs the way production does rather than each inventing a way in.

**The assertion-line diff:** 11 files changed, and only **two** changed their assertion *count* — `TripFenceTest` (the two new ordering cases) and `ArchiveWriteFenceIT` (accept/decline collapsing into the shared `masked` helper). Every other change is a mechanical `editable(x)` wrap around an argument, with the assertion's value untouched.

**Counts read, never exit codes:** `mvn -o clean test-compile` looped quiet; unit `Tests run: 520, Failures: 0, Errors: 0`; the whole backend IT suite `Tests run: 1350, Failures: 0, Errors: 0`. `git diff --name-only` empty before the commit.
