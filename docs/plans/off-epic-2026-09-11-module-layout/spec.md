# Off-epic 2026-09-11 — Module layout: ADR-038's layout rule reaches the ten remaining modules, and `api` stops meaning two things

**What this is.** The tracker for a chore that spans sessions, not a story. ADR-038 rule 2 — layers by default, slices when a layer folder passes about ten files — is ratified and applied to four modules: `diary`, `postcard` and `itinerary` as layers, `trip` as slices. Ten modules still carry the pre-CM-2 flat shape. This effort applies the rule to them one module at a time and closes the one classification error the flat shape produced: wire records sitting in `api/`. Off-epic per `docs/agents/issue-tracker.md` — no story id, a dated slug, one issue per module, a ledger entry in BUILD_STATUS. Nothing here needs a grilling: the rule is decided and each issue is its application. Founder pull, 2026-09-11, in conversation.

**Basis, in the record.** ADR-038 rule 2 (layout) and rule 3 (the guard's front door is `api..` and `exception..`; how an `api` is implemented). ADR-039's governing clarification: *through api* means the module's published **Java** contract called in-process — never the wire. 06b §11: constructor injection, package-private services and controllers, records at the boundary. ADR-039 decision 10 landed every module's guard (PR #60) and measured that nothing outside reaches into these ten; this effort changes their internal shape and nothing about what crosses their line.

## Measured 2026-09-11 (main sources, `dev` at `ab5542dc`)

| Module | Files | Lines | In-process callers | Shape today | Target | Issue |
|---|---:|---:|---|---|---|---|
| report | 32 | 1356 | `SecurityConfig` names `ReportPaths` | flat + `api/` + `web/` | slices | 01 |
| verification | 22 | 694 | none | flat + `api/` + `web/` | layers | 02 |
| place | 17 | 744 | none | flat + `api/` + `web/` | layers | 03 |
| discovery | 9 | 477 | none | flat + `api/` + `web/` | layers, no `api/` | 04 |
| feed | 7 | 337 | none | flat + `api/` + `web/` | layers, no `api/` | 05 |
| profile | 7 | 411 | none | flat + `api/` + `web/` | layers, no `api/` | 06 |
| chat | 11 | 409 | none | flat + `api/` + `web/` | layers, no `api/` | 07 |
| poll | 20 | 1050 | none | flat + `web/` | layers | 09 |
| invitation | 23 | 1208 | `join`, one method of `InvitationApi` | flat + `api/` + `web/` | layers, `api/` stays | 10 |
| join | 43 | 2214 | `SecurityConfig` names `JoinPaths` | flat + `api/` + `card/` + `web/` | slices | 11 |

Eight of the ten have no in-process caller. Two are named only by a route constant, which issue 13 retires. The seven `api/` packages hold **wire records and route constants** — `ChatMessageResponse`, `VerificationCodeResponse` and its two siblings, discovery's five response records, feed's three, profile's three, `JoinPaths`, `ReportPaths` — and no main-tree class outside their module imports any of them. The two "recorded breaches" the chat and verification guards assert still fail (`ChatMessageResponse.of(ChatMessageView)`, `VerificationCodeResponse.of(IssuedCode)`) are this category error and not contract problems: a wire record sat in `api/` because the flat shape had no `dto/`.

## The target shape

The reference is `postcard` for layers and `trip` for slices. Read them before the first move.

| Folder | Holds | Visibility |
|---|---|---|
| `api/` | the in-process contract only: interfaces other modules inject, view records they receive, events; `package-info.java` carrying `@NamedInterface("api")` | public |
| `adapter/` | every concrete adapter at a seam, whichever side the port is on: package-private implementations of this module's `api` where an entity would otherwise cross (ADR-038 rule 3's tell), implementations of other modules' ports (`PhotoAudience`, `Topic`), event listeners reacting to other modules, and the two-sided internal seams (a mailer with a logging and a Resend adapter) | package-private |
| `controller/` | REST controllers and the argument helpers only they use | package-private |
| `dto/` | wire request and response records | public, for Jackson |
| `entity/` | JPA entities, their enums and value types | public where a repository names them |
| `exception/` | published refusals, `{Entity}{Condition}` | public |
| `repository/` | Spring Data interfaces | package-private where the layout allows |
| `service/` | services, inserters, internal view records, internal port interfaces | public class, package-private constructor |

Slices, for a module whose `service/` would pass ten files: `<slice>/` folders, each flat while it stays scannable and taking the layer sub-folders when it passes ten — `trip/dump/` is the flat form, `trip/plan/` the folded one. One `api/` and one `exception/` stay at the module root.

**The classification rule this effort enforces.** A type is `api` only if another module calls it in-process. A type is `dto` if it appears in a controller signature. Nothing is both. Issue 08 lands a list-free ArchUnit rule pinning it: no class in `com.largata..api..` is the return type or a parameter type of a method declared on a `@RestController`. It is born green in the PR that moves the last wire record out, never with an exception list.

**Per module, what `api/` holds when this effort is done.**

| Module | `api/` afterwards | Why |
|---|---|---|
| invitation | `InvitationApi` | `join` calls it |
| report, join | `ReportPaths`, `JoinPaths` until issue 13 retires them; then nothing | a route constant is not a contract, and `SecurityConfig` naming it is a recorded cycle |
| chat, verification, discovery, feed, profile, poll | nothing | no caller; every record there is wire and moves to `dto/` |
| place | nothing | `PlaceSuggester` is an internal seam with two adapters (fixture, Photon) and no caller outside the module; it moves inward. A seam earns `api/` when its second side exists — if `trip` ever needs places in-process, a `PlaceApi` is minted then |

**When `api/` goes, the guard changes with it, and this is the one place a guard edit is expected.** ArchUnit fails a rule whose `that()` selects no class (`failOnEmptyShould`), so a guard for a module with no `api/` drops its *"the contract depends on nothing behind it"* rule — and, for chat and verification, the test that asserts the recorded breach still fails — and says why in the `.as()` of the rule that remains. The meta-test's exemption regex is untouched by this: deleting a rule with no subject is not a by-name exemption. Modulith: with no `@NamedInterface`, the module's root package is its api, and the root is empty; `ModulithVerificationTest` must still refuse postcard alone.

## What "done" means for one module — every issue inherits this

- Every main-tree file of the module sits in one of the target folders; the module root holds no class. Package declarations and imports follow. `git mv` for every move, staged by explicit path — never `git add -A`.
- Test files mirror the move: `src/test/java/com/largata/<module>/web/` becomes `controller/`, a unit test follows its subject's package, the boundary test stays at the module root. Nothing else about a test changes but its package line and imports; no assertion is edited.
- No wire record is left in `api/`. Until issue 08's rule exists, the check is by hand: grep the module's `api/` for any type a `@RestController` in the module names.
- `mvn -o clean test-compile` looped until quiet. An incremental compile after a move reports `BUILD SUCCESS` on a tree that does not compile — TW-1 paid this three times.
- `mvn -o surefire:test` green with the `Tests run:` line read. The boundary guards, `ModuleGuardMetaTest`, `ModuleCycleTest`, `ModulithVerificationTest` and `NewWorldBoundaryTest` are surefire, and several read source by path.
- `mvn -o test-compile failsafe:integration-test failsafe:verify -Dit.test='com.largata.<module>.**.*IT'` green with the counts read. A pattern matching nothing fails the build rather than passing on zero.
- `ModuleCycleTest`'s recorded set unchanged; `ModulithVerificationTest` still refuses postcard alone; the module's own guard still passes and its `theAllowlistPredicatesActuallySelectSomething` still selects something.
- Nothing on the wire changes (ADR-008): no route, no field, no code. If in doubt, the Playwright `api` project against the local stack is the external check.
- The issue's `Status:` line and the BUILD_STATUS ledger line are updated in the **last commit on the branch**, before the PR is merged.
- CI green on the push, read with `gh run watch --exit-status`, counts read from the log.

## Sequencing and independence

- Issues 01–07 and 09–11 are independent of each other: any order, any session. Issue 08 is blocked by 02, 04, 05, 06 and 07, the five that move a wire record out of `api/`. Issue 12 is independent. Issue 13 needs a founder yes before it starts: it edits `SecurityConfig`, which is inside the auth stop rule.
- The recommended order is the numbering: the leaves first, `join` last because it is the largest and the only one taking slices.
- One PR per issue is the default. Two or three small issues may share a branch when one session does them together; the squash is the rollback unit either way.
- Branch: `chore/module-layout-<module>`. Commit: `refactor(<module>): module-layout — <what moved>`, so `git log --grep module-layout` finds every commit of this effort. Off-epic commits carry no story id.

## Session protocol — how a cold session resumes

1. `git status --porcelain`. Anything printed belongs to somebody else and is never staged, stashed or reverted.
2. Read `issues/`. Take the lowest-numbered issue whose `Status:` is `ready-for-agent` and whose `Blocked by:` are all `resolved`. Set `Status: claimed` and commit that line first, so a second session sees it.
3. Branch off `dev`, do the module against the checklist above, push after every commit.
4. Last commit on the branch: `Status: resolved`, the ledger line's glyph, and a line under the issue's `## Comments` recording anything found on the way. Open the PR; never merge unasked.
5. Anything raised that outlives the issue goes to the epic map's backlog, never into this directory.

## Out of scope, and why

- **`identity`.** A story, not a chore. Splitting `follow` out and replacing the `Traveler` entity in 133 controller signatures changes what crosses module lines; the epic map's `RequestPrincipal` line owns it and it is grilled.
- **`common`.** Its dissolution is the deferred `common.authz` line (ADR-039 decision 5).
- **`ws`, `media`.** Outside the rule by classification (ADR-038: transport, shared infrastructure). Issue 13 deletes one constant from `ws/api` and touches nothing else there.
- **`health`.** Five files.
- **Any foreign-key drop or named schema.** The FK-drop story, a stop-rule item. Issue 12 is only the cheap half that line names as pullable at any story.
- **`trip`, `diary`, `postcard`, `itinerary`.** Done.

**Candidate-capability note:** none — no act, no surface. **Freshness note:** no surface changes; nothing to classify.

## Comments
