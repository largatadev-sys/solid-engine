# 06 — CI: three jobs, red on any failure

**What to build:** Every push (any branch) and every PR runs three parallel GitHub Actions jobs, and any failure turns the run red: (1) backend — `mvn verify` with Testcontainers Postgres on the runner's Docker; (2) mobile — `npm ci`, `tsc --noEmit`, Jest; (3) stack smoke — `docker compose up --build -d`, poll `GET /v1/health` until 200 (bounded), `docker compose down`. Build + test only — no deployment automation (S0.4's story), no path filters, no retries, no coverage gates.

**Blocked by:** 03 — Error contract · 04 — Composed stack · 05 — Mobile skeleton.

**Status:** ready-for-agent

- [ ] Green run on the feature branch with all three jobs passing
- [ ] "CI red on test failure" proven once: a deliberately failing test pushed, run observed red, commit reverted (evidence linked in Comments)
- [ ] Smoke job fails red if health never reaches 200 within the bound
- [ ] Workflow triggers on push to any branch and on PRs

## Comments
