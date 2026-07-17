# S0.5 — Founder preview polish + physical-phone sideload · spec

**Status:** intent locked 2026-07-17 — grilling session, owner-confirmed. Immutable point-in-time intent (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.
**Context anchor:** Epic 0 (follow-up polish — E0's completion record is unchanged) · S0.4 spec + story gate (the preview and the release train this story finishes) · ADR-010 (local builds, no EAS). Slice definition: `docs/design/07-epic-map.md` → S0.5 *(pulled from the backlog 2026-07-17)*.

## The pull (what this is and why now)

The backlog bundled two small independent pieces raised 2026-07-16 — founder feedback on the preview, and the S0.4 sub-AC deferred at close — because both are preview/native finish work. One story, one branch, because both are tiny; two cleanly separated tickets because they share no code. **As-built naming note:** the preview lives at **`founders.largata.com`** (the S0.4 gate's as-built record), not the plan-time `preview.largata.com` that the epic map still carried — corrected in the epic map this story (living doc); S0.4's plan files stay frozen (immutable intent).

## Goal

The preview's sign-in screen shows founders what the Android launch actually ships (Google + email), with the Google button graceful rather than dead; and the signed release APK — the real shipping artifact — proven on the owner's physical phone against the deployed dev backend, including the one behavior that differs between debug-signed and release-signed builds: Google sign-in.

## Locked decisions

### Piece (a) — cosmetic Google button on the founder preview

- **The capability model splits, because the requirement splits it.** `authCapabilities.google` today gates two different questions with one boolean: "render the Google button?" (`sign-in.tsx`) and "does this build have a working Google doorway to configure?" (`_layout.tsx` — calling `installGoogleSignIn()` on web is a startup crash). A visible-but-nonfunctional button makes the answers diverge on web, which a boolean cannot represent. **Decision: tri-state** — `google: 'full' | 'cosmetic' | 'none'` in `authContract.ts`. Native declares `'full'`; the web preview declares `'cosmetic'`. The sign-in screen renders the button when `!== 'none'`; the layout installs the SDK only when `=== 'full'`. The invalid state "functional but hidden" is unrepresentable; the future real web surface moves web `'cosmetic'` → `'full'` and neither call site changes. *(Two booleans rejected: representable nonsense states, no expressiveness gained. `Platform.OS` in the screen rejected: both call sites carry recorded reasoning for capability-over-platform.)*
- **The tap path is already built.** `authRepository.web.ts`'s `signInWithGoogle()` throws an `AuthError` the screen already catches and displays. The only code the tap needs is new copy: **"Google sign-in works in the app — use email here in the preview."** (Frames the button as a promise about the app, not a deficiency of the preview — a dead click reads as "broken app.")
- **Not Apple** (decided at S0.4): Apple sign-in is iOS-phase only; the Android launch ships Google + email, so an Apple button would over-promise.
- **AC is founder-visible, verified post-merge:** the sign-in screen at `founders.largata.com` shows the Google button, tapping shows the graceful message, email sign-in still works. Feature-branch evidence = local web export + tests; the live check is a story-gate step after the squash-merge redeploys the preview service (S0.4 precedent — the dev env tracks the `dev` branch, CI-gated).
- **Sharing caveat, carried by this spec:** founders still see the interim worklog palette, not the final brand (own backlog item, due before E4) — say so when demoing. This story does not make the preview "look like the product"; it makes the sign-in screen honest about the app's doorways.

### Piece (b) — sideload the release APK on the owner's phone

- **`build-release.ps1` gains `-ApiBaseUrl`, default `https://api-dev.largata.com`**, exported as `EXPO_PUBLIC_API_BASE_URL` before prebuild — Expo's dotenv loading never overrides a real process env var, so this cleanly beats `mobile/.env` (which keeps the emulator alias `10.0.2.2`: that file is local-dev config, and flipping it back and forth for releases is exactly the invisible-state failure class the S0.4 gotchas catalogue). **The baked URL is echoed loudly in the build summary next to the signing cert** — every build states what it points at. A dev default is correct while dev is the only backend; **the default must be revisited when the prod rung exists** (recorded as a comment in the script + noted for the backlog's prod-rung story).
- **Owner step, prerequisite of the Google AC:** register the release keystore SHA-1 **`ff05c732d03f69d00612d95fcf5c33be05dfdf39`** in Firebase console → `largata-dev` → Android app (`com.largata.app`) → SHA certificate fingerprints. The debug SHA-1 was registered at S0.2; the release key's was not — the recorded landmine this story defuses.
- **Google sign-in is an explicit AC, not just email.** The story is not "the flow works on a phone" but "the *release-signed artifact* works on a phone" — and Google sign-in is the one behavior that differs debug- vs release-signed (email works without the SHA-1 and would mask an unverified registration until some future build trips on it). AC: on the sideloaded release APK, sign in with Google **and** complete the S0.3 flow (create → list → view) against the deployed dev backend.
- **The APK builds from the feature branch** — S0.5 touches no backend code, so the deployed dev backend is valid to test against pre-merge, and the AC evidence exists before the BUILD_STATUS ✅ flip (which must land on the branch).
- **No bundle-grep verification of the baked URL** (deliberate): the release bundle is Hermes bytecode, so the literal-string check from the web-export gotcha is unreliable there — and the device AC *is* the verification; a wrong URL fails at the first screen.

### Bookkeeping & git

- Epic map: the backlog bullet elaborates into the S0.5 story entry under Epic 0 (the bullet is removed — a pulled item's home becomes its story entry); the S0.4 line's stale `preview.largata.com` corrected to `founders.largata.com`. BUILD_STATUS: S0.5 row, `🔄` at pull, `✅` + spec link in the last feature-branch commit. **No ADR** (the tri-state is trivially reversible, self-explanatory at the call sites, and the reasoning lives in code comments + this spec); **no glossary change** (`authCapabilities` is app mechanics, not ubiquitous language). S0.4's plan files stay frozen.
- Work on **`feature/S0.5-founder-preview-polish`** off `dev` · commits `feat(mobile): S0.5 …` / `docs(plans): S0.5 …` (story id mandatory; no agent signature). Spec, tickets, epic-map/BUILD_STATUS edits ride this branch.
- **Sequencing:** piece (a) code + tests → piece (b) script change → owner registers the SHA-1 → build + sideload + device AC → docs finalize → **propose** squash-merge into `dev` and wait (promotions are propose-first) → post-merge preview check closes the gate.

## Deliberate deferrals (recorded, not silent)

| Deferred | To | Why |
|---|---|---|
| Functional Google sign-in on web | real web surface (backlog epic) | Different doorway (browser popup flow + authorized domains), made costlier by the S0.4 REST pivot; buys an interim preview nothing. The tri-state's `'full'` is its landing slot. |
| Apple sign-in button (even cosmetic) | iOS activation (ADR-010) | Android launch ships Google + email; an Apple button on the preview would over-promise. |
| Any other preview polish (palette, brand) | visual-direction backlog item (due before E4) | The palette is a brand decision with its own trigger; this story is sign-in-screen parity only. |
| `-ApiBaseUrl` default revisit | prod-rung backlog story | A dev default is right while dev is the only backend; it becomes a landmine the day prod ships. |

## ACs → proof map

| AC | Proven by |
|---|---|
| Google button on the preview's sign-in screen | Post-merge: browser check on `founders.largata.com`. Feature branch: local `expo export --clear` + serve, button renders |
| Tap → graceful message, never a dead click | Same checks; tap shows the new copy via the existing `AuthError` display path |
| Email sign-in on the preview unchanged | Post-merge round-trip on `founders.largata.com` (sign in → trips list) |
| Native behavior unchanged (`'full'`) | Jest green (`authRepository.test.ts`, `layering.test.ts`) + typecheck; emulator smoke: Google button renders and works |
| Release APK bakes `api-dev.largata.com` | Build-summary echo of the baked URL; device flow (a wrong URL fails at the first screen) |
| Google sign-in works on the release-signed build | Owner: Google sign-in on the physical phone, sideloaded release APK — requires the SHA-1 registration (owner console step) |
| S0.3 flow on the physical phone | Owner: create → list → view against the deployed dev backend |
| No secrets committed | Staged-diff scan; the script's password handling is unchanged (prompted, scrubbed) |

## Out of scope

Store anything (parked Play story) · prod/preprod rungs (backlog) · functional web Google flow · Apple sign-in · palette/brand decision · version bumps (no store versioning pressure; sideload reinstalls fine) · backend changes of any kind.

## Comments

**2026-07-17 — the cosmetic-only decision is superseded at close; S0.6 makes it functional.** This spec locked "functional Google-on-web is explicitly not this" (deferrals table), inheriting S0.4's reasoning. At the story's close, looking at the running preview, the founder reversed the underlying call: **the preview should work, not just look right** — *"every functionality should also work on the preview as much as possible"* — and Google sign-in on the web is the most ordinary button on the internet. The agent's "different doorway" framing was technically true (popup/redirect, authorized domains) but let *"harder than it is"* ride along unexamined; the honest cost is **console config, not code** — `firebaseWebRest.ts` already speaks Identity Toolkit, so `accounts:signInWithIdp` reuses its session/refresh/listener plumbing wholesale. **S0.5 ships as specced** (the body above stands — cosmetic was what was intended when this was written, and the button existing is S0.6's prerequisite); **S0.6** carries the functional flow, landing via the tri-state's `'cosmetic'` → `'full'` with no screen change. The seam earned its keep on the first pull.

**2026-07-17 — the full local stack: a standing rule this story ignored, and the false green it hid.** Artifact 04 §83–89 and 06b §17 already say feature branches are tested on the **full-stack local Docker instance** (Spring + Postgres + MinIO, *fresh DB every redeploy*), with `dev` reserved as the long-lived **preview** rung. S0.5 drove everything against the deployed `dev` backend instead — writing test data into the environment founders look at (an "S05 / Kyoto" itinerary is in the `dev` DB; worth cleaning up), and letting pre-existing rows stand in for proof the flow works from nothing. `docker-compose.yml` existed the whole time; the rule was lost in execution, not translation. Run properly at close, it immediately caught a false green: the flow reached **My Trips**, which read as success, while the `traveler` table was **empty** and the backend had logged only health checks — sign-in had flipped the auth state (a Firebase cloud call) and the router did its job, while the trips fetch failed behind an honest error banner. **Routing is not a round-trip.** Cause was a CORS 403 preflight from an origin the harness invented; with the origin allowed: `GET /v1/itineraries` → **200**, `Traveler provisioned` + `traveler_signed_up` logged, DB 0 → 1. Rule restated in CLAUDE.md (`## Verify on the local full stack`), generalised to what this repo keeps re-learning: **verify at the layer that ships, not the layer that is convenient.**
