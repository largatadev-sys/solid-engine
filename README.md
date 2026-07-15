# Largata

Collaborative trip planning — plan, costs, record. Android + backend monorepo.

## Setup (once per clone)

```sh
git config core.hooksPath .githooks    # activates the pre-commit secret scan
```

## Run the stack

```sh
docker compose up --build              # backend + Postgres + MinIO; needs only Docker
curl http://localhost:8080/v1/health   # {"status":"ok"}
docker compose down                    # wipes the database (no volume — by design)
```

## Run the app

```sh
cd mobile && npm install && npm start  # then press `a` for the Android emulator
```

## Tests

```sh
cd backend && mvn verify               # unit + integration (Testcontainers needs Docker running)
cd mobile && npm test && npm run typecheck
```

## Everything else

`CLAUDE.md` — standing rules, gotchas, git workflow · `docs/design/` — the context package (domain model, architecture, ADRs) · `BUILD_STATUS.md` — what's built.
