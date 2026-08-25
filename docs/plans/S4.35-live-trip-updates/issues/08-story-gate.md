# 08 — The story gate

**What to build:** nothing — the closing pass. The device rung, the record, the promotion proposed.

**Blocked by:** 05, 06, 07.

**Status:** ready-for-agent

- [ ] **Device walk on a release APK, on the founder's phone** — the founder's call at the grilling. Background the app; a second traveler edits and then approves a join request; foreground, and Trips is correct. This is WS-1's AC 10, deferred once into S4.10 and again out of its ticket 04; it closes here. The build needs `LARGATA_ANDROID_JAVA_HOME` set on this workstation — the plugin's own candidate JDK paths all miss here.
- [ ] Dismiss the LogBox banner before tapping anything in a bottom docked rail (S4.19), and never `KEYCODE_BACK` to close a keyboard — it navigates the router.
- [x] An unknown event type is ignored without error on the new subject (extends WS-1's existing dispatcher test).
- [ ] The **single-replica pin** is in place as configuration, with the constraint stated where the deployment lives rather than remembered. The broker trigger is the instance count changing — **not** a connection number; no instrument exists that would measure one honestly against the real edge, and that absence is recorded rather than papered over.
- [x] Run the **full `npx jest` once** before the push — this story adds several modules under `src/` and `--changedSince` cannot see the 22 structural suites (S4.28).
- [x] CI green: read the `Tests run:` counts from the log, never the conclusion alone.
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

**2026-08-25, gate pass — the web rung is closed; the DEVICE rung is BLOCKED, and the blocker is now diagnosed rather than inherited.**

**Closed by this pass:**

- **Backend** — 204 ITs green across `ws`, `join` and `invitation` (`TravelerTopicIT`, `EditingSessionEventsIT`, `TripListEventsIT`, `SchedulerPoolIT`, the posture ITs). CI green on every push; read from the `Tests run:` counts, not the conclusion.
- **Mobile Jest** — 142 suites / 4,808 tests green, run in full before each push because this story adds files under `src/` (S4.28's rule).
- **Playwright** — `live-trips.spec.ts` (6) and `live-travelers.spec.ts` (2) green, **8/8 at `--workers=1`**, against a rebuilt preview container and a rebuilt backend on a fresh database.
- **Unknown event types** are ignored silently — `tripEvents.test.ts` pins it on the new subject, extending WS-1's dispatcher test.

**BLOCKED — the device rung, and S4.34's AC 3 / AC 6 that ride with it.** `:app:assembleDebug` fails at configuration time with *"Could not determine the dependencies of task ':app:compileDebugJavaWithJavac' — Cannot query the value of this provider because it has no value available."* **S4.34 recorded this as a workstation toolchain fault; it is not.** The cause is **`mobile/google-services.json` is absent**. `app.json` names it (`android.googleServicesFile`), the generated `android/app/build.gradle` applies `com.google.gms.google-services`, and with no file the plugin contributes an empty provider — which surfaces as the Gradle message above, naming a Java compile task and nothing about a missing config file. The file is **gitignored by design** (it carries an API key) and has never been tracked, so no amount of branch-switching produces it; CLAUDE.md's *"a fresh clone cannot prebuild without `mobile/google-services.json`"* is exactly this, one layer further along than the error suggests.

**What is NOT the problem, ruled out by running it:** the JDK. This workstation has Temurin **21.0.12** at `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot` — the plugin's hardcoded candidates all miss it, but `LARGATA_ANDROID_JAVA_HOME` pins it correctly and `org.gradle.java.home` is verified present in the generated `gradle.properties`. Prebuild succeeds; 28 Gradle tasks run; the failure is downstream of all of it.

**To unblock:** download `google-services.json` from the Firebase console → `largata-dev` → Project settings → the `com.largata.app` Android app, drop it at `mobile/google-services.json`, then `npx expo prebuild --platform android` and `./gradlew app:assembleDebug`. That needs console access, so it is the owner's step, not an agent's.

**Consequence, stated plainly rather than quietly dropped.** Unproven on any rung: this story's **AC 12** (background the app, a second traveler edits and approves, foreground, Trips is correct — WS-1's AC 10, now deferred a third time); **S4.34's AC 3** (`AppState` foregrounding); **S4.34's AC 6 device half** (retap with real touch); and the **device confirmation of S4.34's silent-revalidation fix** (react-native-web's `RefreshControl` is inert, so no web walk can see a pull spinner that should not spin). The owner decision on Home's anywhere-in-stack retap also waits on that pass.

**NOT DONE — the gate-record Artifact, deliberately.** Its own framing forbids the page this pass could honestly produce: every claim must come from an observed run, and the device half produced none. Publishing greens for the web while the device rung is blocked is the marketing page the ticket warns against. It should be written once the device rung closes, carrying the blockage at the same visual weight as the greens — and S4.34's own gate record travels with it.

**One harness property worth recording, because it will be read as a product failure.** The two live specs pass 8/8 serially and contend in parallel: they share a five-account pool with 27 other specs (`gate.ts`'s `unmetExclusivity()` already reports this posture), and one of them removes a member while another asserts on that member's inbox. Both now call `profileFor` in their seeds — without it, a fresh database has pool accounts with **no handle**, and the by-handle invitation seed dies with *"A handle is required"*, which reads as a broken invite path rather than an unbootstrapped fixture.

**2026-08-25, code review (two axes, fixed point `edc13c0`) — four findings acted on, one disputed with reasons.**

**Fixed:**

1. **`membership.granted` was carrying a payload the spec's table marks a signal.** It shipped `MembershipGrantedFrame(itineraryId)` while the client's handler takes no payload at all — so the field was unread on arrival and unearned on the wire. It is now genuinely `null`. Defensible as built (the frame goes to `Topic.ofTraveler`, so audience *equals* topic and decision 5's narrower-audience rule never bound it), but "defensible" is not "what the table says", and the ticket-08 framing names exactly this drift as the thing a reviewer cannot check from a screen. `TripListEventsIT` now asserts the payload **is null** rather than that it holds one field, and a second assertion pins the frame to the approved traveler's own topic — which is what makes a contentless frame sufficient.
2. **`plan.saved` invalidated the trip-detail query**, i.e. issued a refetch on an event the spec classes absorb-only (*"the client writes it straight into the react-query cache — zero queries"*). It now absorbs into that cache the same way it already did for the list.
3. **A missing workspace→itinerary mapping returned silently**, suppressing both `membership.granted` and `roster.changed` with no trace. It now logs a warning naming the workspace and traveler; an admission with no itinerary behind it is an invariant breach, not a quiet no-op.
4. **Both live specs hand-rolled a four-step seed that `e2e/support/seed.ts` already provides.** `seedTrip({ ownerTag, title, members })` does create → invite-by-handle → inbox → accept and bootstraps profiles, which is also what silently fixed the fresh-database handle failure. ~40 lines removed.

**Disputed, with reasons rather than silence:** the Standards axis called the `spring.task.scheduling.pool` YAML comment a hard violation of *"no code comments — none"*. That rule reads *"no javadoc, no docstrings, no inline commentary, **in source or in tests**"* — code constructs — and **every other block in `application.yml` carries explanatory prose** (datasource, jpa, multipart, security, jwks, web, api, storage, server, logging), a precedent the reviewer noted itself. Configuration states *what*; the *why* behind a non-obvious number has nowhere else to live at the point of use. I did trim the reviewer's stronger half: the comment no longer says which IT guards it, since that duplicates a test and is exactly the claim that rots.

**Re-verified after the fixes:** 55 WS ITs green, mobile Jest 142 suites / 4,808 tests green, both live walks **8/8 at `--workers=1`** against rebuilt backend and preview containers.

**2026-08-25, code review round 2 — two real defects found, one of them introduced by round 1's own fix. Both fixed and guarded.**

**1. A trip created AFTER subscribing never got its registration — its owner was deaf on their own new trip.** The fan-in resolves memberships once at subscribe (decision 2, correctly), and `WorkspaceService.formAround` published **nothing** — `MembershipArrived` had publishers on the invitation-accept and join-approve doors but not on trip creation. So an owner who created a trip while already connected received no `join-requests.changed` and no `roster.changed` on it until they reconnected. **Every e2e walk seeds its trips in `beforeAll`, before connecting, so no walk could ever see this**; it took reading the publisher list. Fixed by publishing `MembershipArrived` from `formAround`, which routes through the same admission listener as the other two doors. Guarded by `TravelerTopicIT.aTripCreatedAfterSubscribingStillReachesItsOwner`, which was **written red first** — `Frames seen: []` — and is green now.

**2. Round 1's fix to `plan.saved` was a DATA-LOSS bug, and this is the important one.** Round 1 flagged the handler's `invalidateQueries` on the trip-detail key as a refetch on an absorb-only event, and I changed it to `setQueryData`. But **the frame carries `planVersion` and `dayCount`, not `days`** — so absorbing it wrote a *new version number onto stale day content*. `edit-plan.tsx` then stages `planFrom(data)` → `basePlanVersion: itinerary.planVersion`, i.e. **old days at the new version**: ADR-023's version fence sees a matching version, accepts the save, and the co-member's work is silently overwritten. Reverted to `invalidateQueries`, which was right all along.
  - **Why round 1's finding was wrong, recorded so the next reviewer does not repeat it:** decision 3 scopes absorb to *"The `ItineraryResponse` **list item** already carries `beingEdited`, `lease`, `editingSession` and `lastEditedBy*`"* — the **list**, not the detail. The "zero queries" claim was never about the detail cache. And the invalidation is cheap where it matters: react-query's default `refetchType: 'active'` refetches only if the detail screen is mounted, and merely marks stale otherwise.
  - **Guarded by `tripEvents.test.ts`** — *"invalidates the trip detail rather than writing a new version onto old days"* — **sabotage-verified**: restoring the `setQueryData` form turns it red. The trap is now a test that fails when re-tripped, which is the only defence against a future reviewer making the same reasonable-looking suggestion.
  - **The lesson worth more than the fix:** I acted on a review finding without tracing what the absorbed fields were *used for downstream*. The finding was locally correct (it *was* a query on an absorb event) and globally wrong. A cache write is only safe if the frame carries **everything the consumers of that cache entry read** — and the consumer here was three files away, in the editor's staging.

**Deferred to the epic map rather than fixed here** (all judgement calls, none defects): the topic grammar is now spelled in three places (Java `Topic`, `subscriptionLedger.ts`, `tripEvents.ts`) with the two TS copies mutually unaware; `TopicSubscriptions.unsubscribe` removes only the named topic while `subscribe` fans out to every trip, so the derived registrations outlive an explicit unsubscribe; `SubscriptionLedger.deliver` — a generic transport — now encodes the product rule *"a trips frame also reaches traveler-subject holders"*; and `MembershipArrived` now has three publishers across three modules while living in `com.largata.invitation`, which no longer names its owner.
