# 08 — Story gate

**What to build:** The story's verification, closed at the layer that ships. The full backend IT suite green (`mvn -o test-compile failsafe:integration-test` — read the `Tests run:` counts, never the exit code). The new editor driver walks committed and green: stage-and-save, stage-and-discard (the confirm's wording printed by the S4.20 stub), the no-write-while-staging assertion on the request log, and the refusal dialog driven with both choices. The two-account stale walk runs on the verified pool — state which tag played which role. The emulator walk covers the staged session end-to-end (mind the LogBox banner over the docked rail) and the accepted crash-loss behavior once, on the record: kill the app with staged edits, nothing persisted (spec AC 9). The web preview walks in the container, never `expo export` + a static server. Wipe the shared Chrome profile before any run whose result is compared. BUILD_STATUS's S4.18 row flips on the branch, in the last commit before the merge proposal.

**Blocked by:** 03 — history by diff · 06 — the activity form stages · 07 — the stale refusal.

**Status:** ready-for-agent

- [ ] Backend ITs green by `Tests run:` count; mobile Jest green; `tsc` clean.
- [ ] The three new/updated editor walks pass against the local stack: stage-and-save, stage-and-discard, refusal dialog — with the request-log staging assertion in each.
- [ ] Two-account stale walk on the pool (e.g. t1 = holder whose session lapses, t2 = intervening saver), both refusal choices exercised, history attribution checked.
- [ ] Emulator walk: acquire → stage all seven op kinds → save → verify on reload; back-discard verified; crash-loss walked once (spec AC 9/10).
- [ ] Web preview container walk green; shared Chrome profile wiped before comparison runs.
- [ ] Every spec AC ticked or its deviation recorded in the spec's Comments; BUILD_STATUS row flipped on the branch.
