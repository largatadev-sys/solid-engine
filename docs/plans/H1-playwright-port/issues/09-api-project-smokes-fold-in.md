# 09 — The API project: the smokes fold in

**What to build:** Every API `smoke-*.js` script's assertions absorbed as request-context specs in the `api` project — the founder's reversal made real. Coverage ports as-is: the smokes' assertions are the contract, so nothing is redesigned, only re-homed. No browser opens anywhere in this project.

**Blocked by:** 01 — Foundation + the discovery pilot.

**Status:** ready-for-agent

- [ ] Each smoke script's assertions exist as an `api`-project spec with coverage parity (the per-script assertion counts are the checklist — e.g. lifecycle's 31, publish's 44)
- [ ] The specs authenticate through the pool exactly as the smokes did, and respect the identity map
- [ ] Each smoke script deletes as it is absorbed — coverage never exists twice
- [ ] A `smoke:api` filter runs the API project alone, in seconds, for the backend-only iterate loop
- [ ] The `api` project runs in parallel with the `web` project under one command, one summary, one exit code
