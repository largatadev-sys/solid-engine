# S0.1 — Repo, environments, and the standing rules · spec

**Status:** intent locked 2026-07-15 — grilling session, founder-confirmed. Immutable point-in-time intent (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.
**Context anchor:** Epic 0 · no domain yet · Artifact 04 (layout, deployment, containerization scope) · Artifact 05 (envelope, `/v1`) · 06a/06b. Slice definition: `docs/design/07-epic-map.md` → S0.1.

## Goal

One thin path through every layer, locally: `docker compose up` from a clean checkout yields the full stack; `GET /v1/health` proves controller → service → repository → Postgres; the standing rules (error envelope, logging filter, secret hook, CI) exist with at least one concrete consumer each. No domain, no auth, no PaaS.

## Locked decisions

### Toolchain
- **Backend:** Java **25 LTS** · Spring Boot **4.0.x** · **Maven** · base package `com.largata`. Boot 3.5's OSS window closes ~now (mid-2026); starting on it would buy a migration mid-build. Maven over Gradle for build-file rigidity/reviewability in an agent-written codebase (android's generated Gradle shares nothing with it — heterogeneity costs nothing). Exact patch versions verified at scaffold time.
- **Testcontainers: 2.x floor, BOM-first.** Take the version Spring Boot 4.0's BOM manages (expected 2.x — verify at scaffold). Only if the BOM still manages 1.x: explicit override to latest 2.x + verify `@ServiceConnection` + note in CLAUDE.md Gotchas (re-examine at every Boot upgrade). Founder constraint from prior version-matrix pain: never hand-pick versions the BOM already coordinates.
- **JUnit:** Jupiter API, version per Boot BOM (JUnit 6 line expected). 06b §7 amended to version-proof wording (founder-approved this session).
- **Mobile:** Expo, latest stable SDK at scaffold · **npm** · **Expo Router** · TypeScript strict (P7: no `any` at boundaries) · Android `applicationId` **`com.largata.app`**. Runs in **Expo Go** for this story — the dev-build is S0.2's opening move (Firebase forces it; S0.1 has zero native modules).
- **Postgres 17** locally. At S0.4: adopt the newest major the chosen PaaS offers, re-pin local to match (17 is the compatibility floor — structural safety while prod is undecided). **UUIDv7 generated app-side**, never DB-side: keeps the DB version unconstraining and IDs pre-persistence (module-boundary friendly).
- **Namespace permanence:** `com.largata` / `com.largata.app` are the working namespace now; the *irreversible* moment is S0.4's first Play upload → domain-registration gate recorded in the epic map's off-epic standing work.

### Local stack (docker-compose.yml at repo root)
- **App:** multi-stage Dockerfile (Maven build inside the image; slim JRE runtime) — clean checkout needs Docker only, no host JDK.
- **Postgres 17: no volume.** `docker compose down` = wipe; "redeploy = fresh DB" by construction, no flags to remember.
- **MinIO:** container + **healthcheck** + `.env.example` placeholders only. **Zero backend wiring until S3.3** — no storage client, no bucket code. The healthcheck makes compose-up itself validate the container so the config can't rot silently. (Founder decision: full local stack from day one, contra the deferral recommendation.)
- **Flyway from day one:** wired in S0.1 with a no-op comment-only `V1__init.sql` — proves the migration pipeline before S0.2 bets the Traveler table on it.
- **Dev workflow:** IDE-run Spring against composed infra (`docker compose up postgres minio`) for the inner loop; **full `docker compose up --build` from scratch is the mandatory per-story verification gate** before any push. The gate always runs the canonical path from a clean state; the loop may cut corners, the gate never does.

### The vertical slice
- **`GET /v1/health`:** hand-built three-layer path (controller → service → repository → `SELECT 1`). **Public** (no bearer token), response minimal `{"status":"ok"}` — no version/commit/uptime/component detail (recon hygiene). DB down → **503 through the standard error envelope**. Actuator deliberately absent (its shape/path bypasses our conventions; revisit at S0.4 if the PaaS wants a probe).
- **`common` ships whole:** `DomainException` + the four category parents (06b §3), one `@RestControllerAdvice` mapping to the Artifact 05 envelope, logging filter injecting `traceId`/`userId`/`endpoint` via MDC (P3).
- **Error path proven test-side:** a test-scoped throwing controller (`src/test` only) + integration tests per taxonomy parent asserting status mapping, envelope shape, and traceId-in-exactly-one-log-line. Nothing debug-flavored in the production jar.
- **Mobile slice:** one screen displaying backend health, strictly through screen → hook → `healthRepository` → typed `apiClient` (`ApiError {code,message,status,traceId}`). ADR-001's layering is load-bearing from the first screen — no `fetch` in UI code, ever.

### Guardrails
- **CI: GitHub Actions** · on push to every branch + PRs (every promotion rung re-checks — the cherry-pick footgun's automated half) · three parallel jobs:
  1. backend — `mvn verify` (Testcontainers Postgres on the runner's Docker)
  2. mobile — `npm ci` + `tsc --noEmit` + Jest
  3. stack smoke — `docker compose up --build -d` → poll `/v1/health` to 200 → `down`
  Any job fails → red. **Build + test only — no deployment automation** (S0.4's story). No path filters, no flaky-retries, no coverage gates until they earn their keep.
- **Secret hook:** tracked **`.githooks/pre-commit`** shell script (Git for Windows runs sh hooks) grepping the staged diff for the CLAUDE.md pattern list (`API_KEY=`, `SECRET`, `PASSWORD=`, private-key headers, long high-entropy strings, any staged `.env`); non-zero exit blocks the commit. Activated per clone via `git config core.hooksPath .githooks` (documented in README — the one discoverable home). **No gitleaks anywhere** (founder decision — declined the CI detection layer). Known accepted limits: unconfigured clones and `--no-verify` bypass the hook — the gitignore remains the primary defence by design.
- **`.gitignore` fact-fix:** add Java entries (`target/`, `*.class`, `hs_err_pid*`).
- **README:** runnable instructions only — one-sentence what-this-is, bootstrap commands (`git config core.hooksPath .githooks` · `docker compose up` · where the app runs), pointer to CLAUDE.md + `docs/design/`. No narrative (it would be a third rotting copy of the docs).

### Pipeline bootstrap
- Create **`dev`** and **`preprod`** branches from current `main` (the story is "repo, environments, and the standing rules" — the branch structure is in scope).
- Work on **`feature/S0.1-repo-and-standing-rules`** off `dev` · commits `feat(skeleton): S0.1 …` (story id mandatory; no agent signature).
- Completion → **propose** squash-merge into `dev` and wait (promotion checkpoint per CLAUDE.md). `main` lags behind `dev` until S0.4's first full promotion — by design, not drift.

## Deliberate deferrals (recorded, not silent)

| Deferred | To | Why |
|---|---|---|
| Backend storage client / any MinIO wiring | S3.3 | No media until E3; container-only presence was the founder's call |
| Mobile cache *technology* (SQLite/MMKV/query-persist) | S0.3 | Health can't inform a cache choice; S0.1 fixes the interfaces, in-memory pass-through behind them |
| Dev-build + Android native toolchain | S0.2 | Firebase is the forcing function; S0.1 has no native modules |
| Postgres major re-pin | S0.4 | Match the newest major the chosen PaaS offers |
| Actuator / platform probes | S0.4 | If the PaaS wants a liveness endpoint |
| Path filters, coverage gates, retries in CI | when minutes hurt | Complexity without current payoff |

## ACs → proof map

| AC (epic map) | Proven by |
|---|---|
| `docker compose up` yields a working stack from clean checkout | CI stack-smoke job (this is S0.1's scripted E2E) + the per-story gate run |
| Health returns 200 with standard conventions | Integration test (Testcontainers) + smoke job; "conventions" = `/v1` path, camelCase, minimal body — success responses carry no wrapper (05 defines only the *error* envelope) |
| Thrown `DomainException` → Artifact 05 envelope, traceId in exactly one log line | Integration tests via test-scoped throwing controller, one per taxonomy parent + log-capture assertion |
| CI red on test failure | Demonstrated once on the feature branch with a deliberately failing test |
| Planted fake secret blocked from commit | Manual AC: stage fake key → commit refused (hook; not CI-testable by nature) |

No logic-layer unit tests: S0.1 has zero domain rules, and 06b §7 scopes unit tests to domain rules in ACs.

## Out of scope

Domain entities · auth (S0.2) · the guard (S0.3 — arrives with the first domain endpoint) · PaaS/deployment (S0.4) · store anything · push notifications · observability beyond the logging filter.

## Comments
