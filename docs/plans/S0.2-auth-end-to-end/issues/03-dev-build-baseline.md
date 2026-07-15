# 03 — Mobile: dev-build baseline — closes the two carried S0.1 ACs

**What to build:** The Android dev-build toolchain, proven in isolation: `expo prebuild` + local Gradle build (ADR-010: no EAS), **zero new dependencies**, installed on the Pixel 7 AVD. The app is the existing S0.1 health screen; the deliverable is observing it **on-device** — which closes the two ACs carried from S0.1 ticket 05. Expo Go is abandoned permanently (its SDK 57 Android client segfaults natively — recorded in S0.1 ticket 05's comments; the store-lag theory was disproven, the crash is the client itself).

Context already banked (2026-07-15): the AVD exists and boots; `10.0.2.2` host-loopback networking is proven via emulator Chrome against the composed stack; the mobile env already points at it. What remains unobserved on-device is only our app's rendering and error state.

Isolation rationale from grilling: this ticket carries no Firebase so that a failure here has exactly one suspect — the build toolchain. Firebase enters in ticket 04.

**Blocked by:** None — can start immediately (parallel with 01).

**Status:** ready-for-agent

- [ ] Local Gradle dev-build installs and launches on the AVD (no EAS, no Expo Go)
- [ ] **(carried S0.1 AC)** health screen shows the backend's ok status on-device against the composed stack
- [ ] **(carried S0.1 AC)** backend stopped → the typed error state renders on-device (no crash, no white screen); restart → recovery
- [ ] S0.1 ticket 05's two open ACs ticked with evidence in its file
- [ ] Prebuild artifacts handled per repo convention (committed or generated — decide and record in Comments with rationale)
