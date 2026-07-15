# 03 — Mobile: dev-build baseline — closes the two carried S0.1 ACs

**What to build:** The Android dev-build toolchain, proven in isolation: `expo prebuild` + local Gradle build (ADR-010: no EAS), **zero new dependencies**, installed on the Pixel 7 AVD. The app is the existing S0.1 health screen; the deliverable is observing it **on-device** — which closes the two ACs carried from S0.1 ticket 05. Expo Go is abandoned permanently (its SDK 57 Android client segfaults natively — recorded in S0.1 ticket 05's comments; the store-lag theory was disproven, the crash is the client itself).

Context already banked (2026-07-15): the AVD exists and boots; `10.0.2.2` host-loopback networking is proven via emulator Chrome against the composed stack; the mobile env already points at it. What remains unobserved on-device is only our app's rendering and error state.

Isolation rationale from grilling: this ticket carries no Firebase so that a failure here has exactly one suspect — the build toolchain. Firebase enters in ticket 04.

**Blocked by:** None — can start immediately (parallel with 01).

**Status:** done

- [x] Local Gradle dev-build installs and launches on the AVD (no EAS, no Expo Go)
- [x] **(carried S0.1 AC)** health screen shows the backend's ok status on-device against the composed stack
- [x] **(carried S0.1 AC)** backend stopped → the typed error state renders on-device (no crash, no white screen); restart → recovery
- [x] S0.1 ticket 05's two open ACs ticked with evidence in its file
- [x] Prebuild artifacts handled per repo convention (committed or generated — decide and record in Comments with rationale)

## Comments

**2026-07-15 — `android/` stays generated, not committed (CNG).**

S0.1's scaffold already gitignored `/ios` and `/android`; keeping that is a decision, not inertia, so here is the reasoning. `expo prebuild` regenerates the native project from `app.json` plus config plugins — the config is the source, the native directory is its build output. Committing it means two sources of truth that silently diverge: an edit inside `android/` survives until the next prebuild wipes it, which is the classic "why did my change vanish" afternoon. It also makes every dependency bump a huge unreviewable native diff.

The cost is real and accepted: a fresh clone must run `npx expo prebuild` before it can build, and anything that genuinely needs native customization must go through a config plugin rather than a file edit. Both are the intended CNG workflow, and neither bites until we need a custom native module — the share-sheet extension (ADR-004, Epic 6) is the first candidate, and it is a config-plugin job by design.

**Prebuild rewrote `package.json`'s scripts** from `expo start --android/--ios` to `expo run:android/run:ios` — Expo Go to dev-build, which is precisely this ticket's transition. Kept.

**2026-07-15 — the two trains collide over JDK versions. `JAVA_HOME=JDK 25` fails the Android build.**

The build failed twice at `:react-native-screens:configureCMakeDebug` and `:react-native-worklets:configureCMakeDebug`, reporting only *"WARNING: A restricted method in java.lang.System has been called"* as the entire "what went wrong" — a JDK warning surfacing as a build failure, which reads like a toolchain bug rather than what it is.

**Cause: this machine's `JAVA_HOME` is JDK 25, which S0.1 requires for the backend (Java 25 LTS), and the Android Gradle Plugin does not support Java 25.** One machine, one env var, two release trains with incompatible requirements (ADR-010 says the trains are separate; it does not say they disagree about the JDK). Android Studio bundles its own JBR — Java 21 — precisely because this collision is universal.

Building with `JAVA_HOME` pointed at the bundled JBR configures cleanly. The durable fix cannot be a file edit inside `android/`: that directory is generated and gitignored (CNG), so a `gradle.properties` change there is erased by the next prebuild. It also cannot be "remember to set the env var", which is the disciplinary guarantee this project rejects everywhere else.

**The fix: a local config plugin, `mobile/plugins/withAndroidJdk.js`**, which injects `org.gradle.java.home` into `gradle.properties` at every prebuild — so the pin is part of the config that *generates* the directory, and regeneration can't lose it. Default is Android Studio's bundled JBR; `LARGATA_ANDROID_JAVA_HOME` overrides it for a JDK 21 living elsewhere (CI, or a Mac at the iOS activation), because machine-specific paths belong in the environment, never a tracked file. If no JDK is found at either, the plugin does nothing rather than write a broken path — Gradle's own error beats one from a helper being clever.

**Verified the way it must be**: `JAVA_HOME` left at JDK 25 (the exact condition that failed twice), build run with no env-var help → `BUILD SUCCESSFUL`, C/C++ compilation and the previously-failing `configureCMakeDebug` tasks included.

**Also required: `app.json` now declares `"googleServicesFile": "./google-services.json"`.** The RNFirebase plugin refuses to prebuild without it. Note the consequence of the gitignored-config decision (grilling Q4), arriving exactly where predicted: a tracked file now names an untracked one, so a fresh clone fails at *prebuild*, not at runtime, with an error about a config field rather than a missing file. Still the right trade — the alternative is a committed API key and a secret-scan taught to ignore `"api_key"` — but it makes the documented setup step load-bearing rather than a courtesy. CI is unaffected and verified: the mobile job runs `npm ci` + typecheck + jest only, never prebuild, so it needs no Firebase config.
