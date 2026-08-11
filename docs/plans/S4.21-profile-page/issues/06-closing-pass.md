# 06 — The closing pass: fidelity, walks, and the gate

**What to build:** The story's verification and hand-off. Mock-fidelity screenshot verdicts against frames 2a/2b on both rungs — web preview container and emulator — including the phone-frame trailing-label truncation check the web viewport cannot catch, and the kill-switch-off eyeball (honest screen renders clean). A profile walk added to the preview driver suite: tab switch, section expand/collapse, postcard navigation, card navigation, cogwheel navigation — entering through the tab like a traveler, not by deep route. Then the pre-promotion gate per the standing rules: full mobile suite, full backend integration suite with counts read from the summary (never the exit code), smoke-all. BUILD_STATUS's S4.21 row flips in this branch's last commit, and the ticket ends with the promotion proposal to `dev` — proposed, not executed. See [spec](../spec.md) acceptance criteria and testing decisions.

**Blocked by:** 03, 04, 05.

**Status:** done

- [x] Side-by-side screenshots against both mock frames on both rungs — **eight** deviations, not six: the spec's six plus the two found at build time, all recorded here and in the spec's Comments with epic-map triggers. Nothing silent.
- [x] No trailing label truncates on the phone frame — the two `space-between` rows the digest flagged (postcard title beside `Day 1 · 5:30 PM`, card title beside `PUBLISHED`) both render whole on the emulator
- [x] Switch off: zeros for Followers/Following, no likes row at all, muted outline star with no number, no price pill — screenshotted on both tabs; the committed tree has the switch back **on**
- [x] The profile walk passes against the rebuilt preview container — 27 passed, 0 failed
- [x] Full mobile suite green; backend IT counts read from the summary; `smoke-all` green but for three walks proven stale on `dev`
- [x] BUILD_STATUS row flipped in the branch's last commit; promotion proposed and awaiting the founder

## Comments

**Gate results** *(agent, 2026-08-11)* — mobile **2806 passed / 79 suites**; backend **639 integration tests, 0 failures** (counts read from the Failsafe summary, never the exit code); `smoke-all` API rungs all green; `drive-profile.js` **27 passed, 0 failed** against the rebuilt preview container. The three walks in `smoke-all`'s FAILED line are dispositioned below.

**Closing record** *(agent, 2026-08-11)*

- **Deviations are eight, not the spec's six.** The two found at build time are recorded in the spec's Comments and carry epic-map backlog lines with triggers: (7) the diary section header renders title + entry count rather than the mock's destinations · N days over a cover thumb, because `DiaryTripResponse` carries none of that and decision 7 ships the listing unchanged; (8) the profile's postcard is a new component rather than an extraction, because there was no postcard *component* to reuse and the two anatomies disagree. Neither is silent, neither is a choice made for convenience.
- **The account page kept its My Trips button** — decision 8 enumerates "card and Edit profile / Reload / Sign out", while the mechanics line says "current composition minus the My Diary section". Read as composition, so the button stayed. Flagging it because the two readings differ and the founder may want it gone.
- **The account page gained a back chevron** — it was a tab root and is now a pushed screen, so it needs an exit affordance the tab bar no longer provides. Not in the mock, which never drew this screen.
- **Both tabs carry a "Show more" control the mock does not draw.** The review flagged it as scope creep on the Itineraries tab; the finding was real but pointed the wrong way — `MyDiarySection`, the surface the Diary tab replaced, already had one, and without it a traveler with more than twenty diary trips cannot reach the rest. Added to the Diary tab rather than removed from the other. The mock draws three trips and never faced the question.
- **Fixture roles:** `t1` = the traveler whose profile is under test; `t2` = the host of a published trip `t1` merely joins — the discriminating case for the showcase.
- **A third finding with no test:** react-native-web drops `accessibilityState={{ expanded }}`, so no `aria-expanded` reaches the DOM. Backlogged on the epic map with the accessibility trigger.

**The carousel needed its own fixture, because every earlier one hid it.** The counter pill, the dots and the 30px peek render only above one photo — and every fixture in the walk and in the pool's older data carried a single photo, so the mock's most distinctive anatomy had only ever been checked as `innerText`. The walk now plants a **three-photo** entry and asserts the pill and the peek geometry; on the emulator a four-photo entry shows `1/4` with four dots and the next photo visible at the edge, and one swipe advances it to `2/4` with the second dot active — which is also the only verification the `snapToInterval` + pitch-based settle from the review-fixes commit has, since unit tests prove the arithmetic and not the render.

**Three walks fail on `dev` today, and this branch neither caused nor fixed them.** `smoke-all` reports `drive-create-flow.js`, `drive-workspace.js` and `drive-publish.js` as FAILED. Proven pre-existing by building a preview container from a clean `dev` worktree and running the same suite against it: **create-flow 12/23, workspace 37/14, publish 24/12 — identical counts on both sides**. The cause is visible without a debugger: these walks look for a control labelled **`Create Itinerary`**, and that label exists nowhere in the app on either branch (S4.15 replaced it with `Plan a Trip`). They are stale walks asserting against a retired vocabulary, so they have been failing since that rename and reporting it every run. **Not fixed here** — repairing three walks for surfaces this story does not touch is its own change with its own verification, and doing it inside a closing pass would bury it. **Recommend a follow-up story or an off-epic line**; until then `smoke-all`'s FAILED line is noise that trains the reader to ignore it, which is the more expensive problem.
