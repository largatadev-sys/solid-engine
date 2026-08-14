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
