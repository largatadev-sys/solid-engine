# 04 — The story gate

**What to build:** nothing — the closing pass. The walks that no runner does, the device rung, and the record put straight.

**Blocked by:** 02, 03.

**Status:** needs-triage

- [ ] Playwright walks green for AC 1, 2 and 6 of the spec: leave-and-return revalidation on Trips, Discover and Profile; retap on all four tabs.
- [ ] **Device rung — dev build on the `largata` AVD**, not a release APK: nothing in this story differs by signing key, so a release build proves nothing extra and costs a prebuild plus a password prompt. Background the app past `staleTime`, foreground it, confirm the focused screen revalidates; walk retap on all four tabs with real touch.
- [ ] Run the **full `npx jest` once** before the push — this story adds modules under `src/`, and `--changedSince` cannot see the 22 structural suites (S4.28).
- [ ] CI green on the branch: read the `Tests run:` counts from the log, never the conclusion alone.
- [ ] BUILD_STATUS: the S4.34 row flips (status + spec link, nothing else) in the **last commit on this branch**, not after the merge.
- [ ] Confirm the discharged epic-map line still reads true against what actually shipped; if the elaboration diverged, the line changes rather than rots.
- [ ] Open the PR to `dev` (that is the proposal) and do not merge it.

## The gate record *(a published visual record of what shipped and what proves it)*

**Read this framing before building it, because the obvious version of this page is worse than not having it.** A diagram drawn from the spec proves the spec was read, not that the code works — and a page of green ticks reads as verification to whoever opens it. So the rule is: **every claim on the page is built from an output a run actually produced, and cites which run produced it.** Nothing is drawn from this ticket, the spec, or the implementer's memory of what they wrote.

- [ ] Publish one Artifact for this story. Title it as a name, not a caption. Sections: **what shipped** (the mechanism, not a changelog), **what proves it**, and **what is not proven**.
- [ ] **The diagram that earns its place here is the request profile, before and after** — which requests fire, on which screen, on which trigger, in both worlds. It is the whole point of the story and it is invisible in any screenshot. Build it from **observed** requests (the ticket-02 backend-log check and the AC-4 observation), not from the code.
- [ ] Every claim carries its source: the spec/IT name, the walk, the screenshot, or the log excerpt. A claim with no source does not go on the page.
- [ ] **Anything unmet, deferred, or closed by the founder rather than by an agent appears on the page, in the same visual weight as the greens** — including who closed the device rung. A gate record that only shows what worked is a marketing page, and this repo has been burned four times by checks whose failure was indistinguishable from their success.
- [ ] Screenshots come from the actual device and browser runs, at the sizes they were taken. No mock-ups, no re-creations.
- [ ] **Every bug found during this story is named on the page beside the thing that now fails if it returns** — the test, or a `REGRESSION_CHECKLIST.md` line where no test can catch it (a filesystem or toolchain property). This is the ratchet, and the page is where it becomes visible: a bug with neither is listed as **unguarded**, in as many words. *A published page does not fail when a fix is reverted — a test does. The page's job is to make it obvious which bugs have one.*
- [ ] Record the published URL in this ticket's `## Comments`, with the date and the commit it describes — the page is a point-in-time record of one build, not a living document.
