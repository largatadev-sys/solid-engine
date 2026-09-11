# 07: the api-is-never-wire guard

**What to build:** the classification ADR-038 rule 1 now states — `api/` holds the in-process contract, `dto/` holds the wire, never both — becomes a property of the build rather than a convention each ticket remembers. One list-free ArchUnit test in the support package beside the cycle rule: no class residing in any `api` package is the return type or a parameter type, generic arguments included, of a method declared on a `@RestController`. It lands only after the six `api/` deletions, so it is born green and needs no exception list; the meta-test's exemption regex never has cause to fire. It deliberately does not reach `dto/` factories that map from an `api` view, which is the converted modules' pattern and correct.

**Measure before asserting.** Run the predicate against the tree first and read what it selects. A converted-module controller found naming an `api` type in its signature is a finding fixed in this PR, never an exemption. Sabotage: move one response record back into an `api` package, use it as a controller's return type, and read the failure naming the class — an unused import is not a bytecode dependency and would not fail, so the sabotage must be a real signature use.

**Blocked by:** 01, 02, 03, 04, 05, 06.

**Status:** resolved

- [x] The rule is stated over `@RestController` methods' return and parameter types, generic type arguments included
- [x] A vacuity check that the import found controllers and found `api` packages, so an empty scan cannot pass — the cycle rule's `theScanReachesRealFilesRatherThanPassingVacuously` is the mould
- [x] Sabotage-checked as above, and the sabotage's failure message names the class
- [x] `ModuleGuardMetaTest.noGuardAnywhereNamesAClassAsAnExemption` still passes: the new test carries no by-name construct
- [x] The spec's verification loop, in full, and the structural guards green
- [x] The last commit sets this ticket `resolved` and flips its ledger glyph; the PR is opened, never merged unasked

## Comments

**2026-09-11 — built, and NOT as this ticket specified. Raised at the series' code review (spec axis).**

The ticket says the guard *"lands only after the six `api/` deletions, so it is born green and **needs no exception list**"*, and that a violation found is *"a finding fixed in this PR, **never an exemption**"*. **The shipped guard carries a three-entry `OUTSIDE_THE_RULE` map.** The ticket's premise was wrong and the measurement is what shows it.

**Measured before asserting, as the ticket did require.** The predicate as literally specified selects **34 controller signatures, and not one is in the ten modules this series converts**: 19 are `common.api.Page<T>` (the pagination envelope every paged endpoint returns), 13 are `identity.api` (`MeResponse` and the traveler cards, named across the tree), one `ws.api.ConnectionTicketResponse`, one `health.api.HealthResponse`. Those are precisely the modules ADR-038 classifies **outside** the layout rule.

So "fix it here, never exempt it" was not available: `common`, `identity` and `ws` are **Out of Scope in this spec**, and fixing them would have been the scope creep the same spec forbids. Unscoped, the rule would have been born **red against code that is correct** — the opposite of what the ticket asked for.

**What shipped instead:** the rule is stated over modules **under** the rule, excluding the others **by module with a recorded reason and by ROLE, never by naming a class** — so `ModuleGuardMetaTest.noGuardAnywhereNamesAClassAsAnExemption` still passes, and a module invented tomorrow is covered the day it is created. A companion test asserts the excluded set is exactly those three.

**The fourth entry is gone.** `health` was excluded by SIZE while the meta-test listed it UNDER the rule — two guards disagreeing about one module. **Ticket 14 converted it** and removed the entry rather than carrying the divergence.

**What the review found, and it was right:** the argument above existed only in a commit message and a PR body. The spec calls the tickets the tracker, so it belongs here. **The honest statement is that AC "needs no exception list" is UNMET, and the ticket's premise — not the implementation — is what was wrong.**

