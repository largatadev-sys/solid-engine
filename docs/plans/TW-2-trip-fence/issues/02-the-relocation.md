# 02: The relocation — `common.authz` dissolves into `trip`, a pure move with zero changed assertions

**What to build:** the trip's authorization model leaves the shared kernel and lands in the module that owns it, and nothing about what it does changes — ADR-039 decision 5, corrected at the grilling. Into `trip.api`: the authorization guard **unedited**, `Membership`, `Role`, the membership-resolver port, and — for this ticket only, unchanged, awaiting ticket 03 — `WriteFence`, `AudienceFence` and `InAudience`. The writability port is renamed for what it answers (`ArchiveState`, is-archived by trip id), its row-backed adapter staying in the workspace slice. `PublicationState` shrinks to the port trip genuinely needs and cannot get from `itinerary.api` without a cycle — is-published and live-among — and the reads everyone else took from it (live-for, published-among) move onto `itinerary.api`'s contract, with `mytrips` and the other pure readers re-pointed; chat, invitation and join read the shrunken port from its new home until their own tickets replace the read with a door. The editing-session question the itinerary module asks becomes a method on trip's plan contract. Into `trip.exception`: the four refusals. `AudienceFence` goes **with the fence, not to `identity.api`** — it reads only the archive fact. `common` keeps error, id, tx, config, storage, security. Eight allowlists trade `common.authz` for `trip.api` + `trip.exception`; the trip module's boundary guard treats the moved types as part of its front door; Modulith reports the same refusal count before and after. Spec decision 10.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] No type remains in a `com.largata.common.authz` package; `common` holds only what ADR-039 lists as the kernel
- [x] `AuthorizationGuardTest` moves with the guard and is **unedited** beyond its package and import lines — the stated proof that the guard's semantics did not move
- [x] `PublicationState` in `trip.api` declares only what trip reads; `itinerary.api` carries the reads that left it; every former consumer compiles against the right one, and `ItineraryBackedPublicationState` still implements the port from the itinerary module
- [x] The editing-session question is answered through trip's plan contract, and the itinerary module imports no port for it
- [x] Every module boundary guard that named `common.authz` names `trip.api` and `trip.exception` instead, and `ModulithVerificationTest` and every boundary guard report the same refusals before and after — the count is read, not assumed
- [x] `NewWorldBoundaryTest`'s fixture that names `common.authz` is re-pointed **by hand**, never by a rename sweep — the guard-file trap TW-1 recorded twice
- [x] The assertion-line diff over this ticket's commits against `dev` reports **zero** changed assertions
- [x] `mvn -o clean test-compile` looped until quiet (imports → type visibility → member visibility → misplaced tests, the TW-1 lesson) and `mvn -o surefire:test` run for the eight source-reading guards; the scoped ITs of every touched module green (the WHOLE IT suite was run, not just the scoped ones); CI green on push *(read after the push)*

## Comments

**Closed 2026-09-18.** A pure move: **zero pre-existing assertions changed** across the 18 test files this ticket touched — `node backend/scripts/assertion-diff.js <ticket-01-sha>` reports one entry, and it is `ApiIsNeverWireTest`, a guard this ticket deliberately edited (below). Everything else is byte-identical.

**`AuthorizationGuardTest` moved unedited**, and that is checkable rather than asserted: stripping `package` and `import` lines from both sides and diffing gives an empty result. The guard's semantics provably did not move.

**Where everything landed.** Into `trip.api`: the guard, `Membership`, `Role`, `MembershipResolver`, `WriteFence`, `AudienceFence`, `InAudience`, `PublicationState`, and `TripWritability` **renamed `ArchiveState`** with its method renamed to match (`isFrozen` → `isArchived`) — it answers one question and now says which. Its adapter followed as `RowBackedArchiveState`. Into `trip.exception`: the four refusals. Both target packages already carried `@NamedInterface`, so the moved types became published contract with no new `package-info` — and `common.authz` never had one, which is precisely how the trip's authorization model stayed invisible to every guard while sitting in the kernel. `git` recorded all 13 moves as renames, so history follows the code.

**`PublicationState` split by who needs what, not by convenience.** Trip's port keeps `isPublished` (the fence asks it) and `liveFor` (its own response). The two reads no part of trip ever called — `publishedAmong` (invitation's inbox) and `liveAmong` (the Trips tab) — went to a new `itinerary.api.PublishedItineraries`, which the same adapter implements alongside. `mytrips` now reads `itinerary.api` directly for the live publication instead of borrowing a kernel port, which is what it always meant.

**`TripEditingSession` is gone entirely** — one method, one caller, one implementation. It became `PlanApi.planHeldByAnotherTraveler`, and `ItineraryObjectService` already held `PlanApi`, so the publish path lost a constructor argument rather than gaining one. The port and its adapter are deleted.

**Four guards changed, each because the move made a real dependency visible for the first time:**

1. **`chat` gained `trip.api` + `trip.exception`.** This is the finding worth keeping: chat has always depended on the trip's authorization model, and while that model sat in `common.authz` the blanket `common` allowance hid the edge from the very rule meant to catch it. Six types across two files. Narrow allowance — the front door, not the module.
2. **`invitation` and `mytrips` gained `itinerary.api`**, following the port split. `mytrips`'s rationale string named "the kernel's publication port", which no longer exists; corrected rather than left to mislead the next reader.
3. **`NewWorldBoundaryTest:49` re-pointed by hand** to `anImportOf("trip.api", "Membership")` — the TW-1 guard-file trap, exactly as this ticket predicted. A sweep would have rewritten it silently and the negative case would have gone on passing while proving nothing.

**One guard was imprecise and the move exposed it.** `ApiIsNeverWireTest` failed on four controllers whose `private Membership requireMember(...)` helper returns a `trip.api` type. Nothing reaches the wire: ArchUnit's `getMethods()` includes private methods, so a controller that wraps the guard call in a helper read identically to one that puts the type on a handler — while a dozen controllers doing the same thing inline were fine. The distinction it was drawing was whether somebody had extracted a helper. **Narrowed to non-private methods**, with a new case that counts both what stayed in scope (>100 handlers) and what the narrowing skips (>0 private helpers), so a narrowing that quietly stopped mattering would be visible. **Sabotage-checked**: putting `Membership` on a real `@GetMapping` handler still fails the rule, naming the method. The rule lost false positives, not teeth.

**Counts read, never exit codes:** `mvn -o clean test-compile` looped quiet three times; unit `Tests run: 504, Failures: 0, Errors: 0`; the **whole** IT suite `Tests run: 1350, Failures: 0, Errors: 0`; the 19 guards plus `ModulithVerificationTest` and `ModuleCycleTest` green, same refusals as at `dev`. `git diff --name-only` empty before the commit.
