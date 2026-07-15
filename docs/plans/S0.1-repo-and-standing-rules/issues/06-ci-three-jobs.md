# 06 — CI: three jobs, red on any failure

**What to build:** Every push (any branch) and every PR runs three parallel GitHub Actions jobs, and any failure turns the run red: (1) backend — `mvn verify` with Testcontainers Postgres on the runner's Docker; (2) mobile — `npm ci`, `tsc --noEmit`, Jest; (3) stack smoke — `docker compose up --build -d`, poll `GET /v1/health` until 200 (bounded), `docker compose down`. Build + test only — no deployment automation (S0.4's story), no path filters, no retries, no coverage gates.

**Blocked by:** 03 — Error contract · 04 — Composed stack · 05 — Mobile skeleton.

**Status:** done

- [x] Green run on the feature branch with all three jobs passing
- [x] "CI red on test failure" proven once — **by a real defect rather than a planted one** (see Comments)
- [x] Smoke job fails red if health never reaches 200 within the bound
- [x] Workflow triggers on push to any branch and on PRs

## Comments

**2026-07-15 — implemented. Red-on-failure proven by a genuine defect, not a planted one.**

The AC scripted "push a deliberately failing test, observe red, revert". That turned out to be unnecessary: **the first CI run went red on its own**, on a real bug.

- Run [29392082682](https://github.com/largatadev-sys/solid-engine/actions/runs/29392082682) on `0c513aa` — **failure**. `backend` PASS, `stack` PASS, `mobile` FAIL: `tsc --noEmit` errored with `Cannot find name 'jest'`. The test files use Jest/Node globals but tsconfig resolved no ambient types for them. Jest itself passed throughout — it transpiles without type-checking — so the compiler was the only thing that would ever have caught it. My local typecheck had been run *before* the tests were written, so it was stale and green.
- Fixed in `a41e89e` (tsconfig `types: ["jest","node"]`; `@types/node` promoted from a transitive dependency to a declared one, since any unrelated bump could have evicted it on a fresh `npm ci`).
- Run [29392260891](https://github.com/largatadev-sys/solid-engine/actions/runs/29392260891) on `a41e89e` — **success**, all three jobs green.

This is stronger evidence than the scripted version: a planted failure proves CI notices a test that *is designed to fail*; this proves CI caught a defect the author believed did not exist, on the actual committed tree. Recorded here rather than repeating the theatre.

**Verified:** every push to any branch triggers the run (both runs above came from pushes to the feature branch, no PR involved).
