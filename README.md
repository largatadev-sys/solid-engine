# Largata

Collaborative trip planning — plan, costs, record. Android + backend monorepo.

## New workstation (once per machine)

**Tools.** Versions matter — three of these have burned real sessions (CLAUDE.md's gotchas hold the full stories):

- **Docker Desktop** — the local stack and Testcontainers both need it. Two known Windows Testcontainers wedges (Ryuk's hijacked pipe, the credential-helper hang) look identical and have different fixes — `jstack` the fork and read the parked frame before picking one (gotchas).
- **Node 24.x** — no `engines` pin; this is what the repo is developed against.
- **JDK 25** — the backend (`pom.xml` pins `java.version` 25). Only needed to run Maven locally; the compose build compiles inside the container.
- **A JDK ≤ 24 alongside it** — the Android build. AGP's native step dies on 25 with a warning that reads as a broken toolchain; the prebuild plugin probes installed JDKs and picks a working one itself (JDK 17 known good). Enumerate what's installed before installing anything.
- **Apache Maven 3.9.x on PATH** — there is **no wrapper in this repo**: `./mvnw` fails with "No such file or directory", and in a pipeline that exit is swallowed and reads as success (gotchas).
- **Android Studio + SDK** (compileSdk 36) + an **AVD: Android 16 / API 36, a Play image** with a dev Google account signed in — the Google sign-in regression check needs Play services present.
- **ninja ≥ 1.12** (`winget install Ninja-build.Ninja`) — release builds only; the SDK's bundled 1.10 dies on long paths.
- **Git Bash exports** (every shell that touches Android): `export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk"` and `export PATH="$ANDROID_HOME/platform-tools:$PATH"` — without them Gradle reports "SDK location not found" and `expo run:android` compiles green then fails at install with a `spawn ENOENT` nowhere near the word "adb".

**Git access.** `origin` is `git@github-largatadev:largatadev-sys/solid-engine.git` — `github-largatadev` is an **SSH host alias**, so the new machine needs the SSH key plus the matching `Host github-largatadev` block in `~/.ssh/config` (or re-point origin at plain `github.com` with your own credentials). Then, once per clone:

```sh
git config core.hooksPath .githooks    # activates the pre-commit secret scan
```

**Config and secrets — none of these travel through git, by design.** Copy from the old machine's gitignored files, or re-download:

1. **`mobile/google-services.json`** — Firebase console → **largata-dev** (identify the project by number, `309534715609`) → Project settings → the `com.largata.app` Android app → download. Without it `expo prebuild` fails with *"Path to google-services.json is not defined"*, which does not obviously mean "download a file".
2. **`mobile/.env`** — the `--- Mobile ---` and `--- Web preview ---` sections of `.env.example`, **plus the test-pool pair** (`LARGATA_TEST_POOL_EMAIL_BASE` / `LARGATA_TEST_POOL_PASSWORD`) documented in CLAUDE.md's test-identities section. The pool's Firebase accounts already exist and stay verified — a new machine needs only the env vars.
3. **Root `.env`** — optional: `docker compose up` works with no `.env` at all. Set it only to put real mail (Resend) or real email verification (the Admin SDK credential) on the local stack; unset, both bind honest sink/refuse postures.
4. **The Firebase Admin service-account JSON** — re-download from the console rather than copying (gitignored by filename pattern); inline it into the root `.env` per `.env.example`'s instructions if you need OTP verification locally.
5. **`~/keys/largata-release.keystore` + its password** — from custody, release builds only.
6. **The debug keystore** — copy `mobile/android/app/debug.keystore` from the old machine **before your first prebuild**, or Google sign-in on dev builds silently breaks: `android/` is generated, so a fresh machine mints a *new* debug key whose SHA-1 is not registered in Firebase, and nothing names the cause (the alternative: register the new machine's debug SHA-1 in `largata-dev`). Prebuild preserves an existing keystore.

## Run the stack

```sh
docker compose up --build              # backend + Postgres + Garage (S3-class storage); needs only Docker
curl http://localhost:8080/v1/health   # {"status":"ok"}
docker compose down                    # wipes the database (no volume — by design)
```

## Run the app

Needs the Android toolchain above and a booted emulator. The first build is slow — it downloads the NDK.

```sh
cd mobile && npm ci
npx expo prebuild --platform android   # generates android/ — it is gitignored, never hand-edited
npm run android                        # builds the dev-build and installs it on the emulator
npx expo start --port 8082             # Metro — NOT 8081, the preview container owns that port
```

Expo Go does not work and is not coming back — see CLAUDE.md's gotchas. The dev-build compiles our own SDK, which is what makes it immune to the store client's version.

## Tests

```sh
cd backend && mvn verify               # unit + integration (Testcontainers needs Docker running)
cd mobile && npm test && npm run typecheck
```

Read the `Tests run:` counts, never the exit code — `mvn test` alone runs **zero** integration tests and exits green (CLAUDE.md). The IT-only invocation is `mvn -o test-compile failsafe:integration-test`.

## The other rungs

The web-preview container (the true build path), the port map and why it cannot be rearranged, release builds + sideload, the verified test pool, and every known trap: **CLAUDE.md → "Running the local verification rig"**. Read it before standing any of this up — S0.6 rebuilt that rig from scratch for the want of it.

## Everything else

`CLAUDE.md` — standing rules, gotchas, git workflow · `docs/design/` — the context package (domain model, architecture, ADRs) · `BUILD_STATUS.md` — what's built.
