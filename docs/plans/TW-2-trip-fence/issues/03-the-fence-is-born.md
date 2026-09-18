# 03: The fence is born, and the old doors delegate to it — a deleted trip is not found for everyone, once, for every module

**What to build:** `TripFence`, as designed and amended at the grilling, and the one behaviour change of the story landing in one place. The fence is a final class in `trip.api`, constructed with the two ports (`ArchiveState`, `PublicationState`) and nothing else — no Spring, no database — wired once by a bean in the workspace slice. Six doors, each returning a proof nested inside the fence with a **private constructor**: `inAudience`, `writable`, `editable`, `membershipMutable`, `unfrozen(tripId)`, and the refusal overload that lets a surface name its own exception for the same fact. `Standing` is the type `Membership` and the new `Owner` both implement; the state doors take any standing and return a proof typed by it; **`Owner.of(membership, refusal)` is a self-validating value** — it throws or exists, needs no port, and is not a door. The two owner-refusal classes become one (`join`'s nested class folds into `trip.exception`'s as two factory methods; every code and message unchanged). Then the old doors — `WriteFence`'s four and `AudienceFence`'s one — become **thin delegates** over the fence, which is how the behaviour change reaches every module at once with no signature moving yet: **a deleted (archived) trip answers not-found for every standing, the owner included**, at every door; the mask keeps no role split; `TRIP_ARCHIVED` is no longer emitted. The existing archive ITs are amended here, each changed assertion explained on this ticket by its grilling question. Spec decisions 3, 8, 11; grilling Q3 b, Q11, Q13, Q14, Q15, Q16.

**Blocked by:** 02 (the fence and its ports live in `trip.api`).

**Status:** ready-for-agent

- [ ] `TripFence` exists as specified; its proofs cannot be constructed outside it (a test that tries fails to compile is not writable — so the AC is a source scan: no `new <Proof>(` outside the fence, and the constructors are `private`)
- [ ] `Standing`, `Owner`, `Owner.of` exist; `Owner.of` on a non-owner throws the supplied refusal and on an owner yields a value carrying the membership; `join`'s nested owner refusal is gone and its two messages render unchanged through the unified class
- [ ] The fence's own unit test walks every door × {room open, archived} × {no live Itinerary, live} × {`Membership`, `Owner`}, every refusal overload, and both `Owner.of` outcomes, with two lambdas and no container
- [ ] `WriteFence.requireWritable`, `requireEditable`, `requireMembershipMutable`, `requireMembershipUnfrozen` and `AudienceFence.requireInAudience` delegate to the fence and hold no rule of their own
- [ ] Behaviour: an owner's read of an archived trip answers `ITINERARY_NOT_FOUND`; an owner's write answers `ITINERARY_NOT_FOUND` where it answered `TRIP_ARCHIVED`; a member's answers are unchanged; `unarchive` still reaches the archived trip for the owner (the guard resolves the membership; the act takes no state proof); self-leave still works on an archived trip
- [ ] `ArchiveWriteFenceIT`, `TripArchiveContractIT`, `ArchivedTripListIT` and the api-project `archive-posture.spec.ts` are amended, and **every changed assertion is listed on this ticket with the grilling question that changed it** (Q11 for the owner's edges; nothing else may move); the web-project `archive.spec.ts` is recorded here as stale until ticket 12 replaces it, and Playwright does not run on branch pushes so no quarantine row is needed
- [ ] No module's ITs other than the four named files change; the assertion-line diff proves it
- [ ] Unit suite, the scoped `trip` ITs and the ITs of every module that reaches the old doors green; CI green on push

## Comments

*None yet.*
