# 05 — Mobile skeleton: the health screen through the layering

**What to build:** The Expo app's first screen shows the backend's health status, fetched strictly through the ADR-001 layering: screen → hook → health repository → typed `apiClient` → `GET /v1/health`. No `fetch` in UI code, ever — the layering is load-bearing from the first screen. Backend unreachable/down renders a typed error state (`ApiError {code, message, status, traceId}`), not a crash. Scaffold under `mobile/` as a root-level peer: latest stable Expo SDK (verify at scaffold, record in Comments) · npm · Expo Router · TypeScript strict, no `any` at boundaries · Android `applicationId` `com.largata.app`. Runs in Expo Go — no native modules, no prebuild (dev-build is S0.2's opening move). The repository's cache is an in-memory pass-through; cache technology is explicitly deferred to S0.3.

**Blocked by:** 02 — Backend skeleton *(needs a running `/v1/health`; the composed stack is not required — IDE-run backend suffices)*.

**Status:** done — except two device ACs, **carried to S0.2** (owner decision, 2026-07-15; see "Carried to S0.2" below)

- [ ] **OPEN → S0.2 — Expo Go on the Android emulator shows the health status against the locally running backend** (no emulator exists on the dev machine yet; verified in a browser instead — see Comments)
- [ ] **OPEN → S0.2 — Backend stopped → the screen shows the typed error state** (the error path is proven in a browser and in Jest, but not observed on a device)
- [x] Jest: `apiClient` returns typed data on 200 and throws `ApiError` with correct fields on envelope errors
- [x] `tsc --noEmit` green under strict mode; no `any` at the apiClient/repository boundaries
- [x] No `fetch`/network call outside the `apiClient`
- [x] Expo SDK version recorded in Comments

## Carried to S0.2 *(owner decision, 2026-07-15)*

The two open ACs above close at the start of S0.2, not here. S0.2 needs the Android toolchain regardless — Firebase forces a dev-build — so this is S0.2's prerequisite, not extra work.

**Owner does (once, ~30–60 min, mostly unattended download):**
1. Install **Android Studio** (developer.android.com/studio) — defaults are fine; the first-run wizard pulls the SDK + platform-tools (~3 GB).
2. **Device Manager → Create Virtual Device → Pixel 7 → system image API 35 (x86_64) → Finish.**
3. Launch the AVD once and confirm it boots to a home screen.
   *(~8–12 GB total. Hardware checked 2026-07-15: Ryzen 7 7800X3D, 31.5 GB RAM, virtualization on, 161 GB free — comfortable. Docker Desktop's Hyper-V coexists with the modern AEHD emulator; if the AVD refuses to start with a virtualization error, that is a known Windows wrinkle, not a config mistake.)*

**Agent does (then, ~5 min):**
1. Set `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080` in `mobile/.env` — `10.0.2.2` is the emulator's alias for the host's loopback. **This is the one assumption S0.1 never tested.**
2. `docker compose up -d` → `npx expo start --android`.
3. Observe the screen; stop the backend; confirm the typed error state; restart; confirm recovery.
4. Tick both ACs with the evidence, or report honestly if they fail.

**Known risk:** Expo Go on the emulator installs from the Play Store, so it may hit the same **SDK 57 store lag** that blocked both phones. If it does, these ACs close via S0.2's **dev-build** instead — which compiles our own SDK and is immune to store lag, and is the more meaningful test anyway. Either way they close in S0.2.

## Comments

**2026-07-15 — implemented, with two ACs honestly unmet.**

Versions found at scaffold time: **Expo SDK 57.0.4** (`expo@latest`), React Native 0.86.0, React 19.2.7, TypeScript 6.0.3, Expo Router 57.0.4.

**React pin conflict (resolved, recorded in CLAUDE.md gotchas):** Expo SDK 57 pins `react@19.2.3`, but `expo-router` pulls `react-dom@19.2.7`, which peer-requires `react@^19.2.7`. Expo's own constraints contradict each other. We hold **19.2.7** — the value that lets `npm install` resolve without `--legacy-peer-deps` (muting the resolver would leave the incoherent graph in place to detonate at runtime). `expo install --check` will keep reporting this; do not "fix" it.

**The two unmet ACs — no emulator run.** No Android emulator was launched in this session, so nothing was *observed on a device*. What was proven instead:
- `npx expo export --platform android` bundles successfully (2.6MB Hermes bundle) — the dependency tree resolves for a real build, not just for `tsc`.
- 15 Jest tests cover the apiClient's success and error translation, the repository's read-through, and a layering test that greps every file under `app/` and `src/` for raw `fetch`.

That is meaningfully weaker than the ACs ask for: bundling proves the app *builds*, not that the screen *renders* or that the emulator can reach `10.0.2.2:8080`.

**2026-07-15 (later) — verified in a browser instead. The ACs still stand unticked.**

**Expo Go cannot run this project.** Both the owner's iPhone and Android phone report *"Project is incompatible with this version of Expo Go"*. Cause: the SDK 57 Expo Go client has not reached the app stores yet (SDK 56 shipped 2026-07-07; 57 is newer), and Expo's own API confirms an SDK 57 client exists (android 57.0.2 / ios 57.0.4) but store rollout lags. **No update fixes this — there is nothing to update to.** Root cause is the scaffold: `create-expo-app@latest` pulled a days-old SDK, and "latest stable" was taken to mean the newest npm tag rather than the newest SDK whose *client* had shipped. Owner decision: **stay on 57**, do not downgrade a foundation to buy one demo — S0.2's dev-build compiles our own SDK into our own container and ends the store-lag problem permanently.

**Verified via React Native Web** (`npx expo start --web`), against the live composed stack:
- ✅ The screen renders; **"Backend: ok"** displayed, sourced through screen → hook → repository → apiClient → `GET /v1/health` → Spring → Postgres.
- ✅ With `docker compose stop backend`, **"Backend unreachable" / `NETWORK_UNAVAILABLE`** renders — the typed `ApiError` path, not a crash or white screen. This is the half no unit test can reach (ADR-001's dead-zone posture, proven).
- ✅ Recovery: restarting the backend and pressing "Check again" returns to ok — the error state is not sticky.

**Why this does not tick the ACs.** They say *"Expo Go on the Android emulator"* and *"the screen shows the typed error state"* on a device. Web proves the layering, the rendering, and the error path; it does **not** prove native rendering, nor the `10.0.2.2` emulator alias / LAN networking assumption — still the one genuinely unproven thing. Redefining the ACs to match what was reachable would be marking my own homework. **They close at S0.2**, which cannot avoid an emulator (Firebase forces a dev-build) and tests the networking assumption as a side effect.

**Two things web cost, both recorded in CLAUDE.md gotchas:**
1. **`npx expo install react-dom` broke the app** — it installed the SDK's `19.2.3` against our `react@19.2.7`, and the web bundle died at runtime with *"Incompatible React versions"* on a white screen. `react` and `react-dom` must be pinned to the same exact version. Verified the fix from inside the served 4MB bundle: only `19.2.7` appears.
2. **A dev-only CORS config was needed** (`DevCorsConfig`, `@Profile("dev")`) — browsers enforce CORS, native clients do not. Bound to the dev profile with two tests proving it is enabled in dev and **absent** by default, because a permissive CORS policy on the production API would let any website call it with a traveler's credentials.

**2026-07-15 (S0.2 start) — emulator attempt: Expo Go crashes natively; the networking assumption is proven anyway. ACs remain open, close on the dev-build.**

The AVD (Pixel 7, API 36 x86_64) is installed and boots. The recorded store-lag risk did **not** materialize — `npx expo start --android` sideloads a matching Expo Go 57 client straight from Expo's CDN, bypassing the Play Store. The bundle builds and executes (`Android Bundled`, JS "main" runs, 4 attempts). But the experience then dies in **Expo Go's own native code**: `Fatal signal 11 (SIGSEGV) … tid mqt_v_js` — a segfault on the RN JS thread inside the Expo Go client, Android force-finishes the activity back to the Expo Go home screen. No JS error, nothing our code can cause or fix; this is the days-old SDK 57 Android client (57.0.2) on the x86_64 emulator. The ticket's fallback applies: **both ACs close on S0.2's dev-build**, which compiles our own SDK and drops Expo Go entirely.

What *was* proven today, decoupled from Expo Go: **the `10.0.2.2` host-loopback alias works** — Chrome on the emulator fetched `http://10.0.2.2:8080/v1/health` from the composed stack and rendered `{"status":"ok"}` (screenshot-verified). `mobile/.env` now points at `http://10.0.2.2:8080`. The one genuinely untested assumption behind AC 1 is retired; what remains open is only observing *our app's* screens on-device, which the dev-build provides.
