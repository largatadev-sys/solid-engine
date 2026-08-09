# 05 — Story gate: the three-rung walk

**What to build:** The story's evidence. The full smoke walk on all three rungs — backend suite green (no wire change expected: assert none happened) · emulator walk · web-preview container walk with the driver — plus the fidelity screenshots: the editor chip beside S4.17 frame 1, the day header pencil+trash beside an activity row's pair, and the create/edit forms side by side. BUILD_STATUS row updated in the last commit on the feature branch, per the standing rule.

**Blocked by:** 01, 02, 03, 04.

**Status:** ready-for-agent

- [ ] Backend ITs green with zero backend diffs in the story branch (spec: wire changes — none).
- [ ] Emulator: chip · pencil rename · create with multi-destination and cover · edit round-trip with "Save" · date change leaving days untouched — all walked with screenshots (spec ACs 1–6).
- [ ] Web preview container: the same walk through the driver, zero console/page errors, zero anonymous `/v1` requests.
- [ ] The mobile test suite is green; `workspaceEyebrow` is absent from the tree (spec AC 7).
- [ ] BUILD_STATUS row flipped in the final feature-branch commit; squash-merge to dev proposed, not executed (promotions are propose-first).
