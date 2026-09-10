# 08: the guard that pins the classification — nothing in `..api..` is a controller signature type

**What to build:** one list-free ArchUnit test beside `ModuleCycleTest` in `support/`: no class residing in `com.largata..api..` is the return type or a parameter type of any method declared on a class annotated `@RestController`. It states the rule ADR-039 clarified — *api* is the in-process Java contract, the wire is `dto/` — as a property of the tree rather than as a convention each module remembers. Born green: it lands only after the five issues that move wire records out of `api/`, so it needs no exception list and the meta-test's exemption regex never has cause to fire.

**Measure before asserting.** Run the predicate against the tree first and read what it selects. A new-world controller naming an `api` type in its signature would be a finding to record in the ledger and fix in this PR, never an exemption. Sabotage: move one response record back into an `api/` package, use it as a controller's return type, and read the failure naming the class — an unused import is not a bytecode dependency and would not fail (PR #60's trap), so the sabotage must be a real signature use.

**Blocked by:** 02, 04, 05, 06, 07.

**Status:** ready-for-agent

- [ ] The rule is stated over `@RestController` methods' return and parameter types, including generic type arguments (`Page<X>`, `List<X>`, `Optional<X>`)
- [ ] A vacuity check that the import found controllers and found `api` packages, so an empty scan cannot pass
- [ ] Sabotage-checked as above, and the sabotage's failure message names the class
- [ ] `ModuleGuardMetaTest.noGuardAnywhereNamesAClassAsAnExemption` still passes — the new test carries no by-name construct

## Comments
