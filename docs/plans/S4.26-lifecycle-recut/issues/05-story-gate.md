# 05 — Story gate

**What to build:** The whole-stack proof, once, and the closeout. The full sweep runs at the end, not per-edit (the scale-to-stage rule): full backend ITs, full mobile Jest, `npm run smoke`. The emulator walk covers what only a device proves — both adaptive landings, both drawers driven by touch, the archived link, the tab row under real width constraints. The shipped UI is checked against the canvas frame by frame (mock-fidelity rule), with any deviation named rather than passed off as a choice. Docs close out and the promotion is proposed — never executed.

**Blocked by:** 04 — the Playwright re-anchor + new specs.

**Status:** needs-triage

- [ ] Full backend IT suite green with counts read from the `Tests run:` summary; full mobile Jest green; `npm run smoke` green — all three stated with numbers in the write-up
- [ ] Emulator walk: both landing seedings, Start and Complete through their drawers, the archived link — screenshots taken, pool identities stated (t1 = owner, …)
- [ ] Canvas fidelity pass, frame by frame; deviations named or "none" stated
- [ ] `support.js` sits beside the archived canvas (or its absence is re-noted in the digest)
- [ ] BUILD_STATUS row flips to ✅ with the spec link **in the last commit on the feature branch**; the squash-merge to `dev` is proposed to the owner, not executed
