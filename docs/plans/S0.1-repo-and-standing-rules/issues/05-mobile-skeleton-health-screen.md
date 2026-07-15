# 05 — Mobile skeleton: the health screen through the layering

**What to build:** The Expo app's first screen shows the backend's health status, fetched strictly through the ADR-001 layering: screen → hook → health repository → typed `apiClient` → `GET /v1/health`. No `fetch` in UI code, ever — the layering is load-bearing from the first screen. Backend unreachable/down renders a typed error state (`ApiError {code, message, status, traceId}`), not a crash. Scaffold under `mobile/` as a root-level peer: latest stable Expo SDK (verify at scaffold, record in Comments) · npm · Expo Router · TypeScript strict, no `any` at boundaries · Android `applicationId` `com.largata.app`. Runs in Expo Go — no native modules, no prebuild (dev-build is S0.2's opening move). The repository's cache is an in-memory pass-through; cache technology is explicitly deferred to S0.3.

**Blocked by:** 02 — Backend skeleton *(needs a running `/v1/health`; the composed stack is not required — IDE-run backend suffices)*.

**Status:** done

- [ ] **NOT DONE — Expo Go on the Android emulator shows the health status against the locally running backend** (see Comments: no emulator was launched; bundling was proven instead)
- [ ] **NOT DONE — Backend stopped → the screen shows the typed error state** (same reason: the error *path* is unit-tested, but not observed on a device)
- [x] Jest: `apiClient` returns typed data on 200 and throws `ApiError` with correct fields on envelope errors
- [x] `tsc --noEmit` green under strict mode; no `any` at the apiClient/repository boundaries
- [x] No `fetch`/network call outside the `apiClient`
- [x] Expo SDK version recorded in Comments

## Comments

**2026-07-15 — implemented, with two ACs honestly unmet.**

Versions found at scaffold time: **Expo SDK 57.0.4** (`expo@latest`), React Native 0.86.0, React 19.2.7, TypeScript 6.0.3, Expo Router 57.0.4.

**React pin conflict (resolved, recorded in CLAUDE.md gotchas):** Expo SDK 57 pins `react@19.2.3`, but `expo-router` pulls `react-dom@19.2.7`, which peer-requires `react@^19.2.7`. Expo's own constraints contradict each other. We hold **19.2.7** — the value that lets `npm install` resolve without `--legacy-peer-deps` (muting the resolver would leave the incoherent graph in place to detonate at runtime). `expo install --check` will keep reporting this; do not "fix" it.

**The two unmet ACs — no emulator run.** No Android emulator was launched in this session, so nothing was *observed on a device*. What was proven instead:
- `npx expo export --platform android` bundles successfully (2.6MB Hermes bundle) — the dependency tree resolves for a real build, not just for `tsc`.
- 15 Jest tests cover the apiClient's success and error translation, the repository's read-through, and a layering test that greps every file under `app/` and `src/` for raw `fetch`.

That is meaningfully weaker than the ACs ask for: bundling proves the app *builds*, not that the screen *renders* or that the emulator can reach `10.0.2.2:8080`. **Carried to ticket 08's gate run** — it is the natural place to launch the emulator once, against the composed stack, and close both ACs. If the gate cannot run an emulator either, this must be raised rather than quietly ticked.
