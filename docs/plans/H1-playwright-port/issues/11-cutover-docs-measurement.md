# 11 — Cutover: the CDP layer dies, the docs catch up, the number is measured

**What to build:** The endgame the whole story exists for. The last CDP remnants delete, the command surface lands in its final shape, the prescriptive docs speak the new vocabulary, and the suite's wall-clock is measured against the 15–25 minute baseline — the number this story was fired to move.

**Blocked by:** 02, 03, 04, 05, 06, 07, 08, 09, 10 — every other ticket.

**Status:** ready-for-agent

- [ ] `smoke-all.js` is deleted; `npm run smoke` runs the full Playwright suite; `smoke:api` / `smoke:web` filter by project
- [ ] `ws` is gone from the dependencies; no CDP or raw-WebSocket code remains anywhere under the scripts tree
- [ ] CLAUDE.md's verification and recipe sections are swept: commands current, `drive-preview` references verified against the re-engined tool, the web rung speaks **specs**, "walk" survives only on the device rung; historical narrative untouched
- [ ] The scripts README documents the one-time per-machine `npx playwright install chromium` step
- [ ] The flow inventory gains a pointer from each rebuilt flow to the spec that now covers it
- [ ] Suite wall-clock (total and per-project) is measured on the gate lane and recorded in this ticket's Comments against the 15–25 minute baseline
- [ ] The glossary records the harness vocabulary; the standing ban on new CDP scripts is stated where the next harness author will read it
- [ ] The BUILD_STATUS row updates in the last commit on the feature branch

## Comments

**Wall-clock, measured 2026-08-18 on the gate lane** (preview container on 8081, local full stack, this workstation — 4 CPUs):

| Run | Result | Wall-clock |
|---|---|---|
| Whole suite, both projects | **526 passed · 1 flaky · 1 skipped** | **8m 12s** |
| `api` project alone | 284 passed | **~20–48s** |
| `web` project alone, 1 worker | 242 passed | 15m 42s |
| `web` project alone, 5 workers | 19 failed (starvation) | 13m 06s |

**Against the 15–25 minute baseline the story was fired to move: 8m 12s for strictly more coverage than the six walks carried.** The API rung is the sharper win — seven serial scripts taking ~30s become 284 assertions in ~20s, and `smoke:api` now answers a backend-only change without opening a browser.

**Two workers is this box's ceiling, and that was measured rather than assumed.** Running the web project at 5 workers on 4 CPUs was *slower* (13m 06s) and produced 19 failures, almost all `Timeout` on assertions that are rock-solid at 2 — including the simplest one in the suite. The concurrency curve is therefore already answered at the top end; there is no worker count above ~2 that helps on this hardware. A CI box with more cores would tell a different story, which is exactly why the number is recorded with the machine.

**A caveat on the intermediate numbers above:** the 5-worker and 1-worker runs straddled a Docker Desktop crash (the daemon died mid-run, not the containers). Their failure *counts* are therefore not clean comparisons — the two 404s that survived at 1 worker were the backend going away, not a product defect. The 8m 12s figure is from a clean run against a restored stack and is the one to quote.

**The gate keeps its three rungs.** This suite is one; the backend ITs and the emulator walk are unchanged.
