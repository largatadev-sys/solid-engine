# 04 — The story gate

**What to build:** nothing — the closing pass. The walks that no runner does, the device rung, and the record put straight.

**Blocked by:** 02, 03.

**Status:** in-progress

- [x] Playwright walks green for AC 1, 2 and 6 of the spec: leave-and-return revalidation on Trips, Discover and Profile; retap on all four tabs.
- [ ] **Device rung — dev build on the `largata` AVD**, not a release APK: nothing in this story differs by signing key, so a release build proves nothing extra and costs a prebuild plus a password prompt. Background the app past `staleTime`, foreground it, confirm the focused screen revalidates; walk retap on all four tabs with real touch.
- [x] Run the **full `npx jest` once** before the push — this story adds modules under `src/`, and `--changedSince` cannot see the 22 structural suites (S4.28).
- [x] CI green on the branch: read the `Tests run:` counts from the log, never the conclusion alone.
- [x] BUILD_STATUS: the S4.34 row flips (status + spec link, nothing else) in the **last commit on this branch**, not after the merge.
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

## Comments

**2026-08-24, implementation — tickets 01–03 are closed; this ticket is PARTLY done and one item is BLOCKED.**

**Closed by this pass:**

- **Playwright, AC 1 / 2 / 4 / 6** — `e2e/web/focus-freshness.spec.ts`, 15 tests. Green at the project's configured `retries: 1`. **Sabotage-verified twice**: neutering `useRevalidateOnFocus` turns all six AC-1/AC-2 tests red, and gating the Trips list on `!isRefetching` turns the no-blank test red with 7 blank frames caught.
- **Full `npx jest`** — 141 suites, 4773 tests, green. Run before each push, as S4.28 requires for a story adding files under `src/`.
- **CI** — green on the branch; read from the log, `Test Suites: 141 passed · Tests: 4770 passed` at the time of the retap commit.
- **BUILD_STATUS** — the S4.34 row moved to 🔄, not ✅, because the device rung below is unmet.
- **REGRESSION_CHECKLIST line 29** — the react-native-web `animated: true` scroll trap, with its automated guard named and its residual manual half stated.

**BLOCKED — the device rung (`AppState` foregrounding, AC 3; the device half of AC 6).**

`:app:assembleDebug` fails on this workstation at configuration time — *"Could not determine the dependencies of task ':app:compileDebugJavaWithJavac' — Cannot query the value of this provider because it has no value available"* — with JDK 21 correctly pinned (`org.gradle.java.home` verified in the generated `gradle.properties`) and after `--stop` plus a clean of `app/build`. **It is not this story's doing, and that was proven rather than assumed:** a `git worktree` at `dev`, prebuilt the same way, fails identically, and `git diff --stat dev...HEAD` shows this branch touches **no** Android build input — not `android/`, not `plugins/`, not `app.json`, not `package.json`. The app was not previously installed on the emulator, so CLAUDE.md's usual escape hatch (a dev build takes its JS from Metro, so JS-only changes are walkable without a successful Gradle run) does not apply — there is nothing to launch.

**Consequence, stated plainly rather than quietly dropped:** AC 3 is **unproven on any rung**, and AC 6's scrolled-down half is proven on **Trips only** on the web — Home, Discover and Profile have nothing to scroll in this fixture, so those three tests *skip*, which the spec reports out loud rather than passing vacuously. Whoever unblocks the Android build should close AC 3 and walk retap on all four tabs with real touch.

**NOT DONE — the gate-record Artifact.** Deliberately not published. Its own framing forbids the page this pass could honestly produce: every claim must come from an observed run, and the device half produced no runs at all. Publishing greens for the web while the device rung is blocked is exactly the marketing page the ticket warns against. It should be written once the device rung is closed, and must then carry the blockage above at the same visual weight as the greens.

**Two defects found and fixed during the story, both guarded:**

1. **`scrollToOffset({animated: true})` is a no-op on react-native-web.** Home's `toTop(true)` had carried it since S4.22, invisible because Home's fixture has nothing to scroll. Guarded by `tabRetap.test.ts` ("no retap surface passes a bare `animated:true`") and REGRESSION_CHECKLIST line 29.
2. **The focus helper fired per query-state change, not per focus** — `isPending`/`isFetching` in the dep array made it refetch in a loop: 313 feed requests in 70s against `dev`'s 1, measured with a worktree control. Guarded by `revalidateOnFocus.test.ts` ("arms the focus effect with an EMPTY dependency list"), sabotage-verified.

Neither is unguarded.
