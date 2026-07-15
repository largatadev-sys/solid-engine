# Largata

Collaborative trip planning — plan, costs, record. Android + backend monorepo.

## Setup (once per clone)

```sh
git config core.hooksPath .githooks    # activates the pre-commit secret scan
```

**Mobile config — the app cannot build without these.** Both are gitignored (they are per-environment config, and one holds an API key), so a fresh clone must fetch them:

1. **`mobile/google-services.json`** — Firebase console → **largata-dev** → Project settings → the `com.largata.app` Android app → download. Without it `expo prebuild` fails with *"Path to google-services.json is not defined"*, which does not obviously mean "download a file".
2. **`mobile/.env`** — see the `--- Mobile ---` section of `.env.example` at the repo root:
   - `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080` (`10.0.2.2` is the Android emulator's alias for the host's loopback; a physical phone needs the PC's LAN IP)
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — from `google-services.json`, `client[0].oauth_client`, the entry with `client_type: 3`. Google sign-in fails at the token exchange without it.

## Run the stack

```sh
docker compose up --build              # backend + Postgres + MinIO; needs only Docker
curl http://localhost:8080/v1/health   # {"status":"ok"}
docker compose down                    # wipes the database (no volume — by design)
```

## Run the app

Needs Android Studio (SDK + an AVD) and a booted emulator. The first build is slow — it downloads the NDK.

```sh
cd mobile && npm install
npx expo prebuild --platform android   # generates android/ — it is gitignored, never hand-edited
npm run android                        # builds the dev-build and installs it on the emulator
```

Expo Go does not work and is not coming back — see CLAUDE.md's gotchas. The dev-build compiles our own SDK, which is what makes it immune to the store client's version.

## Tests

```sh
cd backend && mvn verify               # unit + integration (Testcontainers needs Docker running)
cd mobile && npm test && npm run typecheck
```

## Everything else

`CLAUDE.md` — standing rules, gotchas, git workflow · `docs/design/` — the context package (domain model, architecture, ADRs) · `BUILD_STATUS.md` — what's built.
