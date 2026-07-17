# S0.2 — Auth end-to-end (Firebase → resource server → Traveler) · spec

**Status:** intent locked 2026-07-15 — grilling session, founder-confirmed. Immutable point-in-time intent (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.
**Context anchor:** Epic 0 · identity module · ADR-006 (Firebase Auth, resource server, Traveler keyed by UID) · Artifact 03 (context propagation) · Artifact 05 (envelope) · 06b §3–4. Slice definition: `docs/design/07-epic-map.md` → S0.2.

## Goal

A traveler signs in on the Android dev-build (Google or email), the backend validates the Firebase JWT as a standard OAuth2 resource server, the first authenticated call provisions the domain `Traveler` (keyed by Firebase UID, exactly once), and `GET /v1/me` returns it. The dev-build replaces Expo Go permanently. No profile editing, no account deletion, no workspace anything.

## Facts established at story start (2026-07-15)

- **AVD:** Pixel 7 · API 36 x86_64 installed and booting.
- **`10.0.2.2` host-loopback: proven** — Chrome on the emulator fetched `{"status":"ok"}` from the composed stack (`mobile/.env` now points at `http://10.0.2.2:8080`). The one untested S0.1 assumption is retired.
- **Expo Go is unusable and abandoned:** the SDK 57 Android client (sideloaded from Expo's CDN — store lag was *not* the blocker) segfaults natively (`SIGSEGV`, `mqt_v_js`) after our bundle loads. Recorded in S0.1 ticket 05. The two carried device ACs close on this story's dev-build.
- **Firebase project `largata-dev` exists** (owner, console): Google + Email/Password providers enabled, public-facing name `Largata (dev)`, support email `largata.dev@gmail.com`.

## Locked decisions

### Firebase topology & config
- **One project — `largata-dev` — serves local and `dev`.** Prod-side topology deferred to S0.4. **Forward constraint recorded now:** `preprod` mirrors prod data, and Travelers are keyed by Firebase UID — so `preprod` must share **prod's** Firebase project (test accounts live in prod's pool), or its mirrored Travelers are unreachable. Issuer URI is per-environment env-var config; adding the prod project later is additive.
- **No Auth emulator.** Interactive sign-in runs against the real dev project; backend tests never touch Firebase (below). The ephemeral local DB against the persistent dev user pool re-exercises idempotent provisioning on every redeploy — a feature, not a mismatch. Emulator can be added later as pure tooling if pool clutter ever hurts.
- **`google-services.json` is environment config, gitignored** — same regime as `.env`: real file from the console locally, placeholders/docs in the repo, per-env variants never committed. The blanket never-commit-keys rule stays judgment-free (Google's "not really a secret" position noted and set aside). `GoogleService-Info.plist` inherits this rule at iOS activation. Fresh-clone setup step documented; CI must not need the file (verify at implementation).
- **Debug-keystore SHA-1** registered in the console (owner step, fingerprint extracted by agent via `keytool`); `webClientId` read from `google-services.json`.

### Mobile auth stack
- **`@react-native-firebase/app` + `@react-native-firebase/auth`** (the ADR-006 "first-class RN SDK") **+ `@react-native-google-signin/google-signin`** for the native Google account picker. Exact versions verified at implementation time and recorded in ticket comments (S0.1 convention). Note: google-signin's core native API is free/MIT; its paid "universal" tier is not needed.
- **Dev-build via `expo prebuild` + local Gradle** (ADR-010: no EAS). Expo Go is gone from the workflow permanently.
- **Email-auth scope:** sign-in + sign-up + password reset (all thin Firebase calls; reset email/page hosted by Firebase). **Verification email sent on email sign-up, but nothing gates on `email_verified`** — enforcement is S1.2's decision, made when the invite flow gives it stakes. Sign-out affordance included (needed to test multiple accounts and the 401 path). Minimal me-screen shows what `GET /v1/me` returned; the health screen stays.
- iOS inherits everything at activation: same JS, plus `GoogleService-Info.plist`, Sign in with Apple (mandatory there), EAS builds (ADR-010).

### Backend: identity module
- **Spring Security OAuth2 resource server** validating Firebase JWTs offline against Google's JWKS (issuer `https://securetoken.google.com/<project-id>`). One production code path — no profile-gated validation modes, ever.
- **Provisioning at principal resolution, one chokepoint:** `getOrProvision(firebaseUid, claims)` in the identity module, invoked by the argument resolver that turns the validated JWT into a domain `Traveler` parameter. Any authenticated endpoint provisions on first contact — no "client must call `/me` first" contract (same structural-guarantee philosophy as the Artifact 03 guard; a missing-Traveler 500 on S0.3's endpoints is impossible by construction).
- **Idempotency is the database's job:** `UNIQUE(firebase_uid)` + insert-on-conflict; concurrent first calls race safely, both receive the winner's row. Check-then-insert in application code is rejected as TOCTOU.
- **Claim mapping:** `sub` → `firebase_uid` · `email` → `email` · display name = `name` claim if present, else the **email local-part**. **Display name is non-unique, informational only — never an identifier or lookup key** (glossary sharpened in 02). No sign-up name field (would require a forced token refresh to be visible in claims, for a value uncorrectable until a profile story exists).
- **Claims snapshot once at creation; no syncing on later calls.** Email staleness becomes a real question at S1.2 (invites match by email) and is decided there.
- **Schema (additive Flyway migration):** `traveler(id uuidv7 app-side, firebase_uid unique not null, email, display_name, created_at)`.

### API contract
- **`GET /v1/me` → `{ id, displayName, email }`.** No `firebaseUid` (auth-boundary key, not a domain fact; client knows its own UID), no `createdAt` (no consumer). Under ADR-008 additive-only, omission is free and shipping is permanent — start minimal.
- **401 via custom `AuthenticationEntryPoint`** emitting the Artifact 05 envelope — the `@RestControllerAdvice` cannot produce it (security filters reject before the controller layer exists). **One code, `UNAUTHENTICATED`**, for all flavors (missing/expired/malformed/bad-signature): the client reaction is identical, and finer distinctions only inform probes.
- **`LogContextFilter` ordered before the security chain** so the 401 envelope carries a real `traceId` — ordering asserted by a test.
- **Artifact 05 amendment (additive):** a 401 row — `UNAUTHENTICATED`, missing/invalid credentials, distinct from 403 "authenticated but not permitted" — marked *Added S0.2*.

### Tests
- **Backend tests never touch Firebase.** Integration tests mint JWTs with a **test RSA keypair**; a test-scope `JwtDecoder` built from the test public key lives **inside the single shared `PostgresTestBase`-anchored context** — no second Spring context (CLAUDE.md gotcha: context-cache poisoning). Production security config is untouched by test scaffolding.
- Coverage: 401 envelope for missing/expired/garbage tokens (shape + `UNAUTHENTICATED` + non-empty `traceId`) · provisioning idempotency (second call: no new row, same id) · two-thread same-UID race → exactly one row · claim mapping (with/without `name`) · MDC carries `userId` on authenticated requests, no `userId` on 401 path · slice tests via `spring-security-test` `jwt()` where auth is context, not subject.
- **Mobile:** Jest mocks at the Firebase SDK module boundary — token attach, signed-out state, 401 → sign-in redirect. No new pattern beyond S0.1.
- **The real-Firebase seam is exercised exactly once, by the human device AC** (sign-in on the dev-build). No test signs into real Firebase.

### Sequencing
- Backend half blocks on nothing and runs first/parallel.
- **Dev-build checkpoint one: close S0.1 ticket 05's two carried ACs** (health screen + typed error state, observed on-device) **before any Firebase wiring** — proves the build toolchain in isolation, so a later failure has one suspect.
- Owner steps remaining: SHA-1 registration + `google-services.json` download (when handed the fingerprint).
- Work on **`feature/S0.2-auth-end-to-end`** off `dev` · commits `feat(identity): S0.2 …` / `feat(mobile): S0.2 …` (story id mandatory; no agent signature). Completion → **propose** squash-merge into `dev` and wait (promotion checkpoint).

## Deliberate deferrals (recorded, not silent)

| Deferred | To | Why |
|---|---|---|
| Prod/preprod Firebase project topology | S0.4 | No prod environment exists; forward constraint (preprod shares prod's project) recorded above |
| `email_verified` enforcement | S1.2 | The invite flow gives verification stakes; a wall now is speculative policy |
| Claim re-sync / email staleness | S1.2 | Invites match by email — the story that makes it a real decision |
| Display-name editing | future profile story | An UPDATE, no migration; default (claim/local-part) suffices for the skeleton |
| Sign in with Apple + `GoogleService-Info.plist` + EAS | iOS activation | ADR-010; Apple mandate applies only on iOS |
| Account deletion (= anonymization) | S5.5 | Its own story; completes 01 Compliance |
| Firebase Auth emulator as local tooling | if dev-pool clutter hurts | Pure tooling add; not a validation-path fork |

## ACs → proof map

| AC (epic map) | Proven by |
|---|---|
| Sign-in on the Android dev-build (Google + email) | Human device AC against `largata-dev` — the one real-Firebase exercise |
| Request without token → 401 in the standard envelope | Integration tests (missing/expired/garbage token flavors) + entry-point + filter-order tests |
| First `/me` call creates the Traveler exactly once (idempotent) | Integration tests: second-call no-op + two-thread race → one row (DB constraint arbitrates) |
| `userId` in request-scoped logs via the filter, never set by leaf code | MDC assertion tests; structurally there is no leaf-code seam to set it |
| *(carried from S0.1 ticket 05)* health screen + typed error state observed on-device | Dev-build checkpoint one, before Firebase wiring |

## Out of scope

Profile editing · account deletion (S5.5) · workspace anything (S1.x) · the authorization guard (S0.3, first domain endpoint) · entitlements (S1.8) · push notifications · PaaS deployment (S0.4) · Apple sign-in (iOS activation).
