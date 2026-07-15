# 05 — Mobile skeleton: the health screen through the layering

**What to build:** The Expo app's first screen shows the backend's health status, fetched strictly through the ADR-001 layering: screen → hook → health repository → typed `apiClient` → `GET /v1/health`. No `fetch` in UI code, ever — the layering is load-bearing from the first screen. Backend unreachable/down renders a typed error state (`ApiError {code, message, status, traceId}`), not a crash. Scaffold under `mobile/` as a root-level peer: latest stable Expo SDK (verify at scaffold, record in Comments) · npm · Expo Router · TypeScript strict, no `any` at boundaries · Android `applicationId` `com.largata.app`. Runs in Expo Go — no native modules, no prebuild (dev-build is S0.2's opening move). The repository's cache is an in-memory pass-through; cache technology is explicitly deferred to S0.3.

**Blocked by:** 02 — Backend skeleton *(needs a running `/v1/health`; the composed stack is not required — IDE-run backend suffices)*.

**Status:** ready-for-agent

- [ ] Expo Go on the Android emulator shows the health status against the locally running backend
- [ ] Backend stopped → the screen shows the typed error state, not a crash or raw exception text
- [ ] Jest: `apiClient` returns typed data on 200 and throws `ApiError` with correct fields on envelope errors
- [ ] `tsc --noEmit` green under strict mode; no `any` at the apiClient/repository boundaries
- [ ] No `fetch`/network call outside the `apiClient`
- [ ] Expo SDK version recorded in Comments

## Comments
