# 08 — The story gate

**What to build:** nothing — the closing pass. The device rung, the record, the promotion proposed.

**Blocked by:** 05, 06, 07.

**Status:** ready-for-agent

- [ ] **Device walk on a release APK, on the founder's phone** — the founder's call at the grilling. Background the app; a second traveler edits and then approves a join request; foreground, and Trips is correct. This is WS-1's AC 10, deferred once into S4.10 and again out of its ticket 04; it closes here. The build needs `LARGATA_ANDROID_JAVA_HOME` set on this workstation — the plugin's own candidate JDK paths all miss here.
- [ ] Dismiss the LogBox banner before tapping anything in a bottom docked rail (S4.19), and never `KEYCODE_BACK` to close a keyboard — it navigates the router.
- [ ] An unknown event type is ignored without error on the new subject (extends WS-1's existing dispatcher test).
- [ ] The **single-replica pin** is in place as configuration, with the constraint stated where the deployment lives rather than remembered. The broker trigger is the instance count changing — **not** a connection number; no instrument exists that would measure one honestly against the real edge, and that absence is recorded rather than papered over.
- [ ] Run the **full `npx jest` once** before the push — this story adds several modules under `src/` and `--changedSince` cannot see the 22 structural suites (S4.28).
- [ ] CI green: read the `Tests run:` counts from the log, never the conclusion alone.
- [ ] Confirm **ADR-030's amendment**, the **Editing Session** glossary line and the two discharged epic-map lines still read true against what shipped. If the build diverged, the docs change rather than rot.
- [ ] BUILD_STATUS: the S4.35 row flips (status + spec link, nothing else) in the **last commit on this branch**.
- [ ] Open the PR to `dev` and do not merge it. Propose the promotion; never execute it.

## The gate record *(a published visual record of what shipped and what proves it)*

**Read this framing before building it, because the obvious version of this page is worse than not having it.** The design for this story is already drawn — *The Traveler Topic*, published at the grilling. Redrawing it from the spec would prove only that the spec was read. **This page draws the system as BUILT, from outputs the runs actually produced, and its most valuable content is wherever the two differ.** Nothing comes from the spec, this ticket, or the implementer's memory of what they wrote.

- [ ] Publish one Artifact for this story. Sections: **what shipped**, **what proves it**, **where the build diverged from the design**, and **what is not proven**.
- [ ] **The as-built topology, against ADR-030's amendment.** The subject as parsed, the registration fan-in as it actually resolves, and the seven events with their real frame shapes — read from the code and the ITs, not from the spec's table. **If any event's payload/signal choice differs from the amendment, that is the headline of the page**, not a footnote: the audience rule is the one thing here a reviewer cannot check by looking at a screen.
- [ ] **The delivery path with its real numbers** — queries per event, frames per broadcast, and the measured behaviour of the slow-consumer and heartbeat ITs. These are the claims the design rests on and the only place they become facts.
- [ ] Every claim carries its source: the IT name, the Playwright spec, the log excerpt, the screenshot. A claim with no source does not go on the page.
- [ ] **Anything unmet, deferred, or founder-closed appears at the same visual weight as the greens** — including the device rung's provenance, and explicitly including **the reconnect spec, which has been deferred three times and whose closure here is the single most valuable line on the page.**
- [ ] **State the bounds as prominently as the wins:** one replica, the broker trigger, and the fact that **no connection ceiling was measured** — because no instrument exists that would measure one honestly against the real edge. A page that omits that reads as "this scales", which is a claim nobody made.
- [ ] Screenshots and traces from the actual runs — the release APK walk included — at the sizes they were taken.
- [ ] **Every bug found during this story is named on the page beside the thing that now fails if it returns** — the test, or a `REGRESSION_CHECKLIST.md` line where no test can catch it. A bug with neither is listed as **unguarded**, in as many words. *A published page does not fail when a fix is reverted — a test does. The page's job is to make it obvious which bugs have one.*
- [ ] Record the published URL in this ticket's `## Comments`, with the date and the commit it describes.

## Comments

**2026-08-25, reconciliation with S4.34's close (pre-implementation) — this rung inherited scope and a blocker, both dated after this ticket was approved.** The owner's 2026-08-25 calls on S4.34 (recorded in its ticket 04 Comments) moved three things into this device pass:

- **S4.34's AC 3 closes here:** background the app past `staleTime`, foreground it, the focused screen revalidates. Currently unproven on any rung.
- **S4.34's AC 6 device half closes here:** retap on all four tabs with real touch, the scrolled-down half included. The web rung proved that half on Trips only — Home, Discover and Profile had nothing to scroll in the fixture, and those tests skip on the record rather than pass vacuously.
- **The silent-revalidation fix gets its device confirmation here:** Trips and Home bind `RefreshControl.refreshing` to a gesture-owned `pulling` state (S4.34 review finding 1), because focus revalidation's `refetch()` raises `isRefetching`. react-native-web's `RefreshControl` is inert, so no web walk can see the defect or the fix — confirm on the device that a focus revalidation never spins the pull control. Guard: `focusFreshness.test.ts`.

Nothing about the three differs by signing key, so the body's release walk closes them — no extra build, and any dev-build walk on the AVD closes them equally if it runs first.

**The S4.34 gate-record Artifact travels with this walk** (same owner call): it was deliberately not published because the device half had produced no runs. Once this rung closes, publish it — carrying the blockage history at the same visual weight as the greens — beside this story's own gate record. Two pages, two stories; neither absorbs the other.

**Inherited blocker, found at S4.34's gate:** `:app:assembleDebug` fails on this workstation at configuration time — *"Could not determine the dependencies of task ':app:compileDebugJavaWithJavac' — Cannot query the value of this provider because it has no value available"* — with the JDK pin verified in the generated `gradle.properties`, after `--stop` plus a clean of `app/build`, and **identically on a clean `dev` worktree**, so it is not branch-caused. It fails at configuration time, so expect the release build to hit it too (unproven). Whoever runs this rung clears it first; budget for that before the walk, not during it.

**An owner decision waits on this pass** (epic-map line, 2026-08-25): Home's retap fires from anywhere in its stack while the other three tabs require the tab root, and the consequence differs by platform — on native a hidden feed refreshes, on web the handler has unregistered and the tap does nothing while `preventDefault` still swallows it. Neither half is verified; this pass is where it becomes observable. Put the choice — pop to root, refresh, or both — to the owner with what the walk shows.
