# CLAUDE.md — Largata standing rules

**Standing rules and pointers — not the execution workflow.** How stories are built (the loop, planning, review, slicing) is the workflow's job, chosen per project, deliberately not defined here. This file supplies the rules every workflow must obey. It is rules, not knowledge: if it's knowledge, it lives in the context package below and this file points at it.

---

## Context-package index

- Requirements brief → `docs/design/00-requirements-brief.md`
- Intent & constraints → `docs/design/01-intent-and-constraints.md`
- Domain model & invariants → `docs/design/02-domain-model.md`
- Tenancy / isolation → `docs/design/03-tenancy-model.md`
- Architecture & ADRs → `docs/design/04-architecture.md`
- API conventions → `docs/design/05-api-conventions.md`
- Engineering principles → `docs/design/06a-engineering-principles.md` *(ratified as-is)*
- Engineering decisions → `docs/design/06b-engineering-decisions.md`
- Epic map (the living backlog) → `docs/design/07-epic-map.md`

All code conforms to 06a + 06b. **Dial: MVP grade, except the ledger and the authorization guard, which run at Full rigor.** Name and justify any pattern used (P9).

## Agent skills

### Issue tracker

Local markdown, **tracked in git** — specs and tickets live under `docs/plans/<story-id>-<slug>/`; the epic map (`docs/design/07-epic-map.md`) remains the durable backlog. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, used as-is. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context, mapped onto the existing `docs/design/` package. See `docs/agents/domain.md`.

## State — always maintain

BUILD_STATUS → `BUILD_STATUS.md`. Every story that lands updates its row (status + plan link); every change that wasn't a planned story gets a line in the off-epic ledger. Keeping BUILD_STATUS current is **non-negotiable** — a stale tracker misleads the next session with authority, which is worse than no tracker. Anything raised along the way (idea, issue, deferred feature) is captured in the epic map's backlog — that is its one home. Regression checklist → `REGRESSION_CHECKLIST.md` (a bug that escapes to a human adds a line; a recurring line graduates into the Maestro smoke suite).

## Hard rules (this codebase)

- **All workspace access goes through the authorization guard; never query workspace tables directly.** Workspace-scoped service methods take the resolved `Membership` as a parameter (Artifact 03). No inline authority checks anywhere.
- **All capability gating goes through the entitlement service** — `can(traveler, capability)`; never inline tier checks (ADR-009). v1: it returns full access.
- **The ledger is append-only.** Corrections, waivers, settlements, reassignments are new Transfer entries — never UPDATE or DELETE on ledger rows (INV-8). Splits must sum to the expense total transactionally (INV-7).
- **API changes are additive only within /v1** — never rename, retype, remove, or change semantics of anything shipped (ADR-008; old app versions live for weeks).
- **Modules reference each other by ID + service interface only** — never another module's tables or internals (ADR-002).
- **Mobile: no raw fetch/API calls in UI code** — everything through the repository/local-cache layer's typed apiClient (ADR-001, P6).
- **Never log secrets, tokens, passwords, raw payloads, or PII.** Reference entities by ID (P3).

## Stop rules — ask the owner before doing

Touching the authorization guard or isolation semantics · schema migrations beyond the current story's additive tables · anything in auth/token handling · changing ledger semantics · changing entitlement/gating semantics · deleting data or writing destructive migrations · changing publish/visibility semantics · anything that breaks /v1 additivity · anything irreversible.

## Never commit secrets

No `.env` or any file containing credentials, keys, tokens, passwords, or **PII** enters a commit — ever. This is P3 (never-log-secrets) extended from logs to commits: secrets never enter *any* durable artifact. Two layers, no third-party tool required:

- **Structural guarantee (the real defence): `.gitignore` the secret files before the first commit.** `.env`, `.env.local`, anything holding credentials — gitignored so they *cannot* be staged. Real secrets live only in gitignored files locally and in the platform's env-var UI in prod; the repo carries `.env.example` with placeholders only. If nothing sensitive is ever tracked, there is nothing to leak — it does not depend on anyone remembering.
- **Backstop (soft): scan the staged diff before every commit.** Check the staged content for secret/PII patterns (`API_KEY=`, `SECRET`, `PASSWORD=`, tokens, long high-entropy strings, any `.env` in the staged files) and refuse to commit on a match. It is a backstop *because* it's an instruction — lead with the gitignore, never let the scan become an excuse to relax it.

A committed secret is compromised even if a later commit deletes it (it stays in history) — **rotate it.**

## Git workflow (promotion pipeline)

Branch→environment mapping: `main` → **production** (protected base, real data) · `preprod` → a **pristine copy of production** (the verify gate; data mirrors prod) · `dev` → **long-lived shared preview** (persistent; reseed at the developer's discretion, *not* ephemeral) · **local** → the **ephemeral full-stack instance** (fresh DB every redeploy) where feature branches are built and tested.

Flow: feature branches (`feature/<story-id>-<slug>`) are tested on the **local ephemeral instance**, then **squash-merged into `dev`**. Promotion: **cherry-pick** the verified changes from `dev` → `preprod`, verify against the prod-copy, then promote `preprod` → `main`. Commit convention: `feat(scope): <story-id> …` / `fix(scope): <story-id> …` — **the story id in the message is mandatory**: it is how commits are located (`git log --grep <story-id>`), since BUILD_STATUS stores no SHAs. *Commit messages carry **no agent signature** — no `Co-Authored-By`, no "Generated with" trailer, no attribution line; just the conventional message.*

**Promotions are propose-first.** The agent may run routine git directly — create the feature branch, commit to it — but it **proposes and waits for approval before any promotion**: squash-merging `feature → dev`, cherry-picking `dev → preprod`, or promoting `preprod → main`. Promotions cross environments and are hard to reverse; each is a checkpoint, not an autonomous step.

**Footgun to watch:** cherry-picking after squash-merges can pull a change whose dependency you didn't pick — a subset that built in `dev` may not build in `preprod`. Track inter-change dependencies before promoting. **The mobile train is separate** (Artifact 04, ADR-010 — Android-only until the iOS activation): emulator/dev-build (local, non-EAS) → local backend · Play internal testing → preprod · Play release → prod. Release builds are made locally (Expo prebuild + Gradle) and uploaded manually.

## Gotchas (grows during the build)

- Share-sheet capture requires an Expo **dev build** — plain Expo Go cannot load the native share extension (ADR-004).
- Local **iOS builds require macOS + Xcode** — Android builds run anywhere via Gradle. **The recorded answer is EAS at the iOS activation** (or earlier, if Android release cadence makes manual builds a cost) — no Mac purchase planned (ADR-010).
- **`expo install --check` reports `react@19.2.7 - expected version: 19.2.3` — this is expected; do not "fix" it.** Expo SDK 57 pins `react@19.2.3`, but `expo-router` pulls `react-dom@19.2.7`, which requires `react@^19.2.7`; the two Expo-published constraints contradict each other. We hold `react@19.2.7` (the value that makes `npm install` resolve without `--legacy-peer-deps`). Verified at S0.1: typecheck passes, Jest passes, and `expo export` bundles for Android. Re-check when the SDK bumps — if Expo aligns its own pins, drop back to the SDK's version.
  - **Corollary: `react` and `react-dom` must be pinned to the same exact version, and `npx expo install react-dom` breaks that** — it installs the SDK's `19.2.3` against our `react@19.2.7`, and the web bundle then dies at runtime with *"Incompatible React versions"* on a white screen. After any `expo install` that touches React, check both versions match. (Hit at S0.1 when adding web support.)
- **Expo Go cannot run SDK 57 yet** — the store client lags the SDK release (SDK 56 shipped 2026-07-07; 57 is newer). Phones report *"Project is incompatible with this version of Expo Go"* and no store update fixes it. **This is temporary and ends at S0.2**: a dev-build compiles *our* SDK into *our* container, so the store's Expo Go version stops mattering forever. For a browser check in the meantime: `npx expo start --web`.
- **Testcontainers 2.x renamed everything** — artifacts (`postgresql` → `testcontainers-postgresql`) *and* packages (`org.testcontainers.containers` → `org.testcontainers.postgresql`; the old package is a deprecated shim, and the container class is no longer generic). The 1.x coordinates 404 at 2.x, which reads like "2.x is broken" — it isn't. Versions come from the Boot BOM; never hand-pin them.
- **Boot 4 moved Flyway's auto-configuration out of the JPA starter** into `spring-boot-starter-flyway`. With only `flyway-core` on the classpath, Flyway silently never runs — the app boots green and no migration applies. Use the starter.
- **Testcontainers: use the singleton-container pattern (`PostgresTestBase`), never `@Testcontainers`/`@Container` on a shared base.** Those annotations manage the container *per test class*; Spring caches contexts *by configuration*. The moment a second context exists (e.g. a test with a different `@ActiveProfiles`), a cached context keeps a datasource pointing at a container JUnit already stopped. **Signature: 30-second JDBC timeouts and 503s in test classes you did not touch**, right after adding a test with a different profile. Hit for real at S0.1 when the CORS profile tests landed.
- **Failsafe matches `*IT` on the *outer* class only** — integration tests nested as `static` inner classes are silently skipped, which looks exactly like passing. One test class per file. (Also hit at S0.1: a CORS test "passed" without ever running.)
- *(add as discovered)*
