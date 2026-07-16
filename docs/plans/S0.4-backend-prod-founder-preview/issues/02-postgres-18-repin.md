# 02 — Postgres major re-pin: 17 → 18, everywhere at once

**What to build:** S0.1 recorded the trigger ("at S0.4: adopt the newest major the chosen PaaS offers, re-pin local to match — 17 is the compatibility floor"). Railway lets us pin the image, so the answer is the newest stable major: **18**. Re-pin in the same change: `docker-compose.yml` (`postgres:18-alpine`-class tag) and `PostgresTestBase` (its javadoc carries the "re-pin at S0.4" note — retire it). Every environment, the local stack, and every integration test then run the same major; no environment is newer than what the tests prove.

**Blocked by:** 01 — the Railway instances fix the major being matched.

**Status:** open

- [ ] Compose Postgres pinned to 18; `docker compose up --build` green from clean checkout; Flyway migrations apply
- [ ] `PostgresTestBase` pinned to the same tag; full backend suite green on it (Testcontainers pulls 18)
- [ ] The "re-pin at S0.4" javadoc note replaced with the standing rule (pin = prod's major; UUIDv7 stays app-side regardless — `UuidV7`'s rationale note updated if it names the undecided prod major)
- [ ] CI green (backend job runs the 18 container on the runner)

## Comments
