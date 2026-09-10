# 07: the api-is-never-wire guard

**What to build:** the classification ADR-038 rule 1 now states — `api/` holds the in-process contract, `dto/` holds the wire, never both — becomes a property of the build rather than a convention each ticket remembers. One list-free ArchUnit test in the support package beside the cycle rule: no class residing in any `api` package is the return type or a parameter type, generic arguments included, of a method declared on a `@RestController`. It lands only after the six `api/` deletions, so it is born green and needs no exception list; the meta-test's exemption regex never has cause to fire. It deliberately does not reach `dto/` factories that map from an `api` view, which is the converted modules' pattern and correct.

**Measure before asserting.** Run the predicate against the tree first and read what it selects. A converted-module controller found naming an `api` type in its signature is a finding fixed in this PR, never an exemption. Sabotage: move one response record back into an `api` package, use it as a controller's return type, and read the failure naming the class — an unused import is not a bytecode dependency and would not fail, so the sabotage must be a real signature use.

**Blocked by:** 01, 02, 03, 04, 05, 06.

**Status:** resolved

- [ ] The rule is stated over `@RestController` methods' return and parameter types, generic type arguments included
- [ ] A vacuity check that the import found controllers and found `api` packages, so an empty scan cannot pass — the cycle rule's `theScanReachesRealFilesRatherThanPassingVacuously` is the mould
- [ ] Sabotage-checked as above, and the sabotage's failure message names the class
- [ ] `ModuleGuardMetaTest.noGuardAnywhereNamesAClassAsAnExemption` still passes: the new test carries no by-name construct
- [ ] The spec's verification loop, in full, and the structural guards green
- [ ] The last commit sets this ticket `resolved` and flips its ledger glyph; the PR is opened, never merged unasked

## Comments
