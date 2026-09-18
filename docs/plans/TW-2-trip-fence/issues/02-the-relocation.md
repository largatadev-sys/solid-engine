# 02: The relocation — `common.authz` dissolves into `trip`, a pure move with zero changed assertions

**What to build:** the trip's authorization model leaves the shared kernel and lands in the module that owns it, and nothing about what it does changes — ADR-039 decision 5, corrected at the grilling. Into `trip.api`: the authorization guard **unedited**, `Membership`, `Role`, the membership-resolver port, and — for this ticket only, unchanged, awaiting ticket 03 — `WriteFence`, `AudienceFence` and `InAudience`. The writability port is renamed for what it answers (`ArchiveState`, is-archived by trip id), its row-backed adapter staying in the workspace slice. `PublicationState` shrinks to the port trip genuinely needs and cannot get from `itinerary.api` without a cycle — is-published and live-among — and the reads everyone else took from it (live-for, published-among) move onto `itinerary.api`'s contract, with `mytrips` and the other pure readers re-pointed; chat, invitation and join read the shrunken port from its new home until their own tickets replace the read with a door. The editing-session question the itinerary module asks becomes a method on trip's plan contract. Into `trip.exception`: the four refusals. `AudienceFence` goes **with the fence, not to `identity.api`** — it reads only the archive fact. `common` keeps error, id, tx, config, storage, security. Eight allowlists trade `common.authz` for `trip.api` + `trip.exception`; the trip module's boundary guard treats the moved types as part of its front door; Modulith reports the same refusal count before and after. Spec decision 10.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] No type remains in a `com.largata.common.authz` package; `common` holds only what ADR-039 lists as the kernel
- [ ] `AuthorizationGuardTest` moves with the guard and is **unedited** beyond its package and import lines — the stated proof that the guard's semantics did not move
- [ ] `PublicationState` in `trip.api` declares only what trip reads; `itinerary.api` carries the reads that left it; every former consumer compiles against the right one, and `ItineraryBackedPublicationState` still implements the port from the itinerary module
- [ ] The editing-session question is answered through trip's plan contract, and the itinerary module imports no port for it
- [ ] Every module boundary guard that named `common.authz` names `trip.api` and `trip.exception` instead, and `ModulithVerificationTest` and every boundary guard report the same refusals before and after — the count is read, not assumed
- [ ] `NewWorldBoundaryTest`'s fixture that names `common.authz` is re-pointed **by hand**, never by a rename sweep — the guard-file trap TW-1 recorded twice
- [ ] The assertion-line diff over this ticket's commits against `dev` reports **zero** changed assertions
- [ ] `mvn -o clean test-compile` looped until quiet (imports → type visibility → member visibility → misplaced tests, the TW-1 lesson) and `mvn -o surefire:test` run for the eight source-reading guards; the scoped ITs of every touched module green; CI green on push

## Comments

*None yet.*
