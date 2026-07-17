# S0.4 — Backend train to production + founder preview · spec

**Status:** intent locked 2026-07-16 — grilling session, founder-confirmed. Immutable point-in-time intent (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.
**Context anchor:** Epic 0 · Artifact 04 (deployment & environments) · ADR-006 (Firebase topology; S0.2 spec decision 1 honored here) · ADR-008 (baked URLs are why domains precede any uncontrolled client) · ADR-010 (local builds, no EAS — the sideload proof is this pipeline minus the store) · **ADR-012 (this story: Railway as the PaaS)**. Slice definition: `docs/design/07-epic-map.md` → S0.4 *(re-sliced this session — see below)*.

## The re-slice (what changed and why)

The epic map's S0.4 ("both release trains to production") assumed a Play developer account. None exists, its verification runs on Google's clock, and its only pre-alpha users would be Android testers who don't exist — the founders all carry iPhones; the developer is the only Android device. So the store segment is **parked, not built**: the Play internal testing track moves to the epic-map backlog (trigger: pre-alpha), Play account creation becomes standing work (trigger: ~E4 start), and **Epic 0's exit criterion is amended to "installable via sideload"** — recorded, not silently absorbed. What replaces the store segment: a **founders' web preview** (the only pre-iOS bridge to iPhone-carrying founders) and a **sideloaded release APK** on the developer's phone, which together prove every segment of both trains except the Play upload itself.

## Goal

The backend deployed through the full promotion pipeline to a real production environment on Railway; the founders using the app from their browsers against the deployed `dev` backend; the real signed release APK running the S0.3 flow on the developer's phone against the same cloud backend. No store, no developer accounts, nothing blocked by third-party clocks.

## Locked decisions

### Railway (ADR-012)

- **One Railway project, three environments** — `dev` / `preprod` / `prod`, all in **Southeast Asia (Singapore)** (founders and future alpha cohort are in Asia). Each environment: backend service (Dockerfile deploy from `backend/`) + its own Postgres. **Never a shared Postgres across environments** — isolation is the point of the pipeline.
- **Deploys track branches** per CLAUDE.md: `dev` branch → dev env, `preprod` → preprod env, `main` → prod env, **gated on green CI** (Railway check-suite gating; a red `mvn verify` never reaches an environment).
- **Postgres 18, pinned by explicit image tag** (S0.1's "adopt the newest major the PaaS offers" resolves here; on Railway we pick the image, so newest stable major, never `latest`). Local compose and `PostgresTestBase` re-pin 17 → 18 to match — every environment and every test on the same major.
- **Prod backups: enabled, and restored once.** The AC is a *performed, verified restore*, not a checkbox — an untested backup is a hope. Accepted trade-off, recorded in ADR-012: Railway Postgres is snapshot-class, not PITR; acceptable at pre-validation scale, revisit at post-validation hardening.
- Platform health checks point at `GET /v1/health` (S0.1's "revisit Actuator if the PaaS wants a probe" resolves: no Actuator; our endpoint is the probe).
- Config is env-vars only, set in Railway's UI — the repo carries placeholders (`.env.example`) and nothing real (CLAUDE.md).

### Environment identity (Firebase issuers — S0.2 spec decision 1, honored from first boot)

- **Create the `largata-prod` Firebase project now, backend-side only.** Issuers: `dev` env trusts `largata-dev` (as local does) · **preprod and prod both trust `largata-prod`** (preprod mirrors prod data; Travelers are keyed by Firebase UID — a preprod pointing anywhere else matches nobody).
- **No mobile-side prod wiring** — no prod `google-services.json`, no sign-in providers, no SHA-1s. All of it lands with the parked Play story, where it becomes testable. Accepted consequence: preprod/prod authenticated endpoints are unexercisable until then; health is public, so the promotion AC is unaffected. Prod/preprod must never launch with a "temporary" `largata-dev` issuer — env identity is exactly the config that rots.

### Domains (`largata.com` — purchased 2026-07-16)

- **Wire custom domains for everything, day one:** `api.largata.com` → prod · `api-preprod.largata.com` → preprod · `api-dev.largata.com` → dev · `preview.largata.com` → the web preview. Railway attach + DNS records; TLS automatic.
- Rationale (ADR-008 arriving early): every baked URL — the sideloaded APK's API base, the CORS allowlist, founders' bookmarks — is permanent from the start and survives any future platform move. The future real web surface keeps `app.largata.com`/`www` free; the domain may host unrelated projects on other subdomains (owner's timelog), which touches nothing here.
- S1.2's transactional-email sender domain is now sitting ready (noted; nothing built here).

### Founder web preview (interim by design)

- **The mobile codebase's web export on a separate static service, `dev` environment only, never promoted.** Not a `web/` repo peer — it is an artifact of `mobile/`, and it must be decommissionable by deleting one service. The backend image stays pure Java on all three environments; promotion never carries preview bits toward prod.
- **Auth on web = Firebase JS SDK variants of exactly two files** (`authRepository`, `firebaseTokenSource`) via Metro platform resolution (`.web.ts`); screens and everything above the repository seam stay shared and unforked. **Email/password only; the Google button hides on web** (its native doorway has no web equivalent; the browser popup flow is a day of plumbing the preview doesn't earn — revisit only if a founder asks). **Sign-up stays open, as built** — the thing it exposes is an empty `dev` sandbox; bot-registration noise in the `largata-dev` pool is tolerated (same judgment as S0.2's pool-clutter call).
- CORS opens on the **`dev` environment only**, via a configurable allowed-origin on the existing `dev`-profile CORS config (prod/preprod run no profile → no CORS, unchanged — the native-only stance holds where it matters).
- **Status: founder demo, not a release surface and not test evidence.** Device ACs are never closed on the preview — native-layer behavior (the S0.2 class of bug) is invisible in a browser. Decommissioned or superseded when a real web surface ships (backlog epic) or founders get TestFlight at the iOS activation.

### Mobile release pipeline (ADR-010, minus the store)

- **Real release keystore created this story.** Custody: generated once, lives outside the repo, gitignored by pattern anyway, file + both passwords in the owner's password manager the day it's created — **"recoverable from backup" is an AC.** Signing config wired via the config-plugin/gradle-properties mechanism so `expo prebuild` cannot erase it (CNG rule; same class as `withAndroidJdk`). The parked Play story uploads with this same key — sideload proof and store build ride one signing identity.
- **Fix the release-build toolchain (discovered this session):** `assembleRelease` fails on this machine — release-mode C++ codegen object paths exceed Windows' 260-char limit, and the ninja bundled with SDK CMake 3.22.1 is not long-path-aware (OS long paths are already enabled; the tool is the limiter). Fix = a long-path-capable CMake/ninja for the release variant, pinned so prebuild can't lose it; mechanism is the implementer's call, recorded in ticket comments. **Earns a CLAUDE.md gotcha line once verified.** Debug builds are unaffected (they never crossed the line).
- **Sideload AC:** the signed release APK, API base `https://api-dev.largata.com` baked in, installed on the owner's physical phone — S0.3 flow end-to-end against the deployed cloud backend. (Play wants an AAB later; the phone wants an APK now; same Gradle build, two output formats.)

### Sequencing & git

- Backend/platform first (Railway envs → issuers → domains → promotion), preview second (web auth variants → CORS → static service), release train last (toolchain fix → keystore → sideload AC).
- Work on **`feature/S0.4-backend-prod-founder-preview`** off `dev` · commits `feat(deploy): S0.4 …` / `feat(mobile): S0.4 …` (story id mandatory; no agent signature). Spec, tickets, epic-map/ADR/BUILD_STATUS edits ride this branch (S0.3 owner directive).
- **Promotions are propose-first, including this story's promotion AC**: the dev→preprod→prod chain that proves the pipeline is executed at owner-approved checkpoints, never autonomously. Completion → **propose** squash-merge into `dev` and wait.

## Deliberate deferrals (recorded, not silent)

| Deferred | To | Why |
|---|---|---|
| Play internal testing track (upload, listing, data-safety forms, testers) | **backlog, trigger: pre-alpha** (before E6 completes) | No account, no Android testers to serve; carries the **Play App Signing SHA-1 landmine** (Play re-signs — Google sign-in breaks on Play-delivered builds until the Play signing key's SHA-1 is registered in `largata-prod`) and the AAB upload |
| Play developer account creation | **standing work, trigger: ~E4 start** | Identity-verification lead time + the personal-vs-organization decision (personal accounts post-Nov-2023: 12+ testers × 14 days of closed testing before the production track unlocks — an alpha-planning input) |
| Apple developer account / iOS anything | iOS activation (ADR-010) | $99/yr starts ticking the day it exists; nothing needs it |
| Mobile-side prod Firebase wiring (`google-services.json`, providers, web client id, SHA-1s) | parked Play story | Only consumable by a build pointing at preprod/prod; testable there, speculative here |
| Google sign-in on the web preview | if a founder asks / real web surface | Different doorway (JS popup flow + authorized domains); email/password is free and sufficient |
| Preprod data-mirror mechanism | pre-alpha (with registers #1/#2 era) | Prod is empty; there is nothing to mirror — build the tool when there is data worth copying |
| EAS adoption | ADR-010's recorded triggers | Unchanged |

## ACs → proof map

| AC | Proven by |
|---|---|
| Promotion dev→preprod→prod executed once end-to-end | Owner-approved checkpoints; each env deploys from its branch, CI-gated |
| Prod `/v1/health` green | Curl against `api.largata.com` after promotion |
| Env identity correct | Railway env-var inspection: dev → `largata-dev` issuer; preprod + prod → `largata-prod`; prod/preprod run **no** Spring profile |
| Prod backup restore verified | A snapshot restored once; row-level spot check |
| Founders can use the app in a browser | Founder (or owner-in-browser) round-trip on `preview.largata.com`: sign up/in with email → create itinerary → list → view, against the `dev` backend |
| CORS confined | Preview origin allowed on dev; preprod/prod respond without CORS headers (no profile) |
| Sideload proof | S0.3 flow on the owner's physical phone via the signed release APK against `api-dev.largata.com` |
| Keystore custody | Keystore absent from git (pattern-ignored + scan); restore-from-password-manager exercised once |
| Release toolchain fixed | `assembleRelease` green on this machine; CLAUDE.md gotcha added; survives a fresh `expo prebuild` |
| No secrets in repo | `.env.example` placeholders only; Railway UI holds real values; staged-diff scan stays green |

## Out of scope

Play/App Store anything (parked story + standing work) · EAS (ADR-010) · object storage wiring (S3.3 — MinIO stays container-only; Railway object storage not provisioned until a story needs it) · preprod data mirroring (pre-alpha) · observability beyond platform basics + existing logs (post-validation hardening) · web as a supported platform (backlog epic) · Apple sign-in (iOS activation) · domain email/DNS beyond the four records (S1.2 takes the sender domain).

## Comments

**2026-07-16 — descope at completion: preprod/prod + promotion deferred; S0.4 closes on the dev rung.** Founder decision at the end of the build: the founder web preview on `dev` (`founders.largata.com`) meets the actual near-term need — someone other than the developer testing the product — so standing up `preprod` and `prod` environments to exercise a promotion pipeline that nothing consumes pre-alpha is cost without value. **What S0.4 delivered and proved:** backend on Railway `dev` (Postgres 18, health/401/CORS verified in the cloud) · the founder web preview live end-to-end on a custom domain (auth pivoted to the Firebase REST API — the JS SDK could not be bundled for web; CORS preflight fixed for secured endpoints) · the Android release train (real-keystore signed APK, `CN=Largata`; toolchain fix for the Windows ninja/260-char blocker) · custom domains for the `dev` rung (`founders.largata.com`, `api-dev.largata.com`) · `largata-prod` Firebase project created (backend-side, for the deferred prod rung). **What moved to the backlog** (new item: *preprod + prod environments + the promotion pipeline*, trigger pre-alpha): the `preprod`/`prod` environments, the dev→preprod→prod promotion run, prod `/v1/health`, and the prod backup-restore AC. The `dev` rung is the proof that the shape works; the other two rungs are the same shape, stood up when real users are near. This is the same MVP-thin discipline as the Play-track park: build the pipeline segment when its consumer exists.

**2026-07-16 — implementation note: the "two files" fork, reconciled with six seam files.** The spec above and ticket 04 say the auth fork is "exactly two files." The code adds six to the SDK-seam allowlist (`layering.test.ts`): `authRepository.{native,web}.ts`, `firebaseTokenSource.{native,web}.ts`, plus `authContract.ts` and `firebaseWebApp.ts`. This is not scope creep — the *forked, SDK-calling* files remain two (authRepository, firebaseTokenSource, each with a `.native`/`.web` twin). `authContract.ts` exists specifically to keep the error types **un**-forked: two copies of `AuthError` would be two classes, and `error instanceof AuthError` would silently fail on one platform. `firebaseWebApp.ts` isolates the web SDK's init (native reads `google-services.json`; web needs an explicit config object). Both widen the seam in service of the two-file discipline, not against it. Recorded so the six-entry allowlist is not later misread as the fork having sprawled.
