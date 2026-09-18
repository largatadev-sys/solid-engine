# 11: Contract — the old doors and the dead types are deleted, and the guards that make forgetting a build failure go green

**What to build:** the expand–contract's last step and the story's structural promise. With every caller migrated (tickets 04–10), `WriteFence`, `AudienceFence`, the old `InAudience`, `TripArchivedException` and `TripApi.frozen` are deleted — nothing constructs or calls them. Then the guards, each a property of the build and none a by-name exemption list, each sabotage-checked before it ships: **only the fence refuses** — `ItineraryPublishedException` and `MembershipFrozenException` are constructed only inside `TripFence`, and `NotTheTripOwnerException` only inside `Owner.of` and the acts whose rule is owner-*or*-someone, counted as a ratchet with the list printed in the assertion; **only the resolver mints `Membership`** — `new Membership(…)` appears in production code only in the workspace adapter; **the bare-standing ratchet** — the number of service methods taking `Owner` or `Membership` with no state proof is at most its count at close (archive, unarchive, destroy, self-leave), the list printed, never held as a set; `AudienceFenceCoverageTest`'s name-set shrinks to whatever a proof does not now cover; and **the trip module's outbound allowlist** is born in `TripModuleBoundaryTest`, naming exactly what trip imports — a measurement worth having (it will say `common`, `itinerary.api`, `identity`). Spec decisions 10, 16; grilling Q8.

**Blocked by:** 04, 05, 06, 07, 08, 09, 10 — every migration.

**Status:** done

- [x] `WriteFence`, `AudienceFence`, the pre-fence `InAudience`, `TripArchivedException` and `TripApi.frozen` no longer exist; the wire code `TRIP_ARCHIVED` is emitted by nothing
- [x] *Only the fence refuses*: an ArchUnit rule pins the two freeze refusals to `TripFence`; the owner refusal's constructions outside `Owner.of` are counted, the count is at most the number at close, and the list is printed in the assertion — sabotage-checked by adding one `throw new` in a service
- [x] *Only the resolver mints `Membership`*: sabotage-checked by constructing one in a service
- [x] *The bare-standing ratchet*: the four acts by name in the printed list; adding a fifth turns it red with the new method named — checked
- [x] `AudienceFenceCoverageTest`'s `OWNER_ONLY_OR_DELIBERATELY_UNFENCED` set has lost every handler a proof now covers, and its *stale exception* test still passes
- [x] `TripModuleBoundaryTest` gains the outbound allowlist; what it names is recorded on this ticket, and epic-map line 212 is annotated **done**
- [x] `ModulithVerificationTest` and every boundary guard report the same refusals as at `dev`; `ApiIsNeverWireTest` green — no proof type appears in a controller signature
- [x] Full backend suite green locally (`mvn -o clean test-compile failsafe:integration-test failsafe:verify` plus `surefire:test`, counts read); CI green on push

## Comments

**Closed 2026-09-18.** The expand–contract's contract step: `WriteFence`, `AudienceFence`, the old top-level `InAudience`, `TripArchivedException` and `TripApi.frozen` are **deleted**, and four guards now make forgetting a build failure.

**The last holdout was the legacy diary module** (`postcard.legacy`), which ticket 05 did not touch because its acts are diary acts rather than record reads. Its seven writes take `Writable`, its two reads take the fence's `InAudience`, and `requireRoomForAPhoto` stops re-checking what the proof already carries.

**`TripApi.frozen` is gone** — the fourth port for the archive fact the grilling found at Round 4. Its last caller was the author-edit freeze ticket 05 deleted.

---

### The guards

**1 · Only the fence refuses.** `OnlyTheFenceRefusesTest` pins `ItineraryPublishedException` and `MembershipFrozenException` to `TripFence` — a surface that constructs one has re-derived the fact behind it, which is exactly the nine hand copies TW-2 set out to remove.

> **The sabotage found a hole in my own guard, which is the whole reason to run one.** The first version matched `new MembershipFrozenException(`, so a sabotage throwing `new com.largata.trip.exception.MembershipFrozenException()` — fully qualified — **passed**. Widened to match the type name without the `new`, which catches the qualified form and `X::new` alike, with the exception's own declaration file excluded. Re-sabotaged: caught, naming `ChatService` and the line. A guard whose first sabotage passes is a guard that was proving nothing.

**2 · The owner refusal is a named factory, never a string at a call site.** The ratchet started at **11** and the count was the finding: seven were the exception's own factories (correct), and **four were ad-hoc strings at call sites** — edit-details, add-or-remove-days, delete, and publish/unpublish/preview. Each got a named factory, so every act's wording now lives in exactly one place and a call site cannot quietly reword it. The ratchet closes at **zero** outside the exception class.

*(One near-miss worth recording: the factory I first wrote used a typographic apostrophe where the shipped message has a plain one. That is a wire-visible message change, caught because the swap refused to match the call site it was replacing. The factory now carries the shipped wording exactly.)*

**3 · Only the resolver mints a `Membership`.** A `Membership` answers *what standing does this traveler have on this trip*, and only the thing that reads the row can answer it — anything else is **asserting** a standing, and every proof minted from it inherits that assertion. The workspace **entity** of the same name is a different type and is deliberately outside the rule.

**4 · The bare-standing ratchet**, at **15** and printed rather than held as a set: archive, unarchive and destroy (must reach a closed room), self-leave (S1.9), and reads and internal helpers no door governs. Adding one shows up by name in the failure.

**Both halves of guard 3/4 sabotage-checked in one run** — a service that mints a `Membership` and a new bare-standing method each turned it red, naming the offending line.

---

**5 · `trip`'s outbound allowlist is born, and the measurement is the point.** It names **`common`, `identity`, `media` — and nothing else.** Not `itinerary.api`: the facts trip needs from elsewhere arrive through ports it **declares** and somebody else implements (`ArchiveState`, `PublicationState`), which is what keeps the graph acyclic while the fence still knows whether a plan is frozen. An entry added here is trip reaching outward for the first time and should be argued rather than appended. A fourth case asserts the predicate matches something, so an allowlist forbidding nothing cannot pass.

**`AudienceFenceCoverageTest`'s exemption sets are now both EMPTY** where they held three entries. `preview` fences through `InAudience<Owner>`; join's `link` and `queue` go through `membershipMutable`, which checks the room first. The guard's needle widened from `inAudience(` to **any room-checking door**, since every one of them refuses a deleted trip before asking anything else — otherwise it would have failed on handlers that are *more* fenced than before.

> **One production change fell out of that**: `queue` called a private `theOwnerOfTheQueue(...)` helper, so the door was invisible to a body-text scan. Inlined. The fencing is now visible at the handler, which is better for a reader than for the guard.

**Counts read, never exit codes:** unit `Tests run: 533, Failures: 0, Errors: 0` (up from 526 — four new guard cases plus the widened ones); the whole backend IT suite `Tests run: 1350, Failures: 0, Errors: 0`; `ModulithVerificationTest` and every boundary guard green at the same refusals as `dev`. `git diff --name-only` empty before the commit.
