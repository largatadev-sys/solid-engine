# S4.18 — Buffered plan editing: nothing saves until Save Changes

**Status:** ready-for-agent *(owner review passed 2026-08-11 — implementation authorized, the S4.19/S4.20 precedent)* · **Epic:** E4 · **Depends on:** S4.17 (shipped — the Editing Session and the editor this story re-plumbs), S4.19 (shipped — the day pencil, rename input and shared form the staging must not regress), S4.9 (shipped — the activity-history capture the save-diff now feeds)

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** ADR-023 (this story's decision record — the reversal of ADR-022 decision 3's saving semantics + the version-checked bulk save) · ADR-022 (the two surfaces and the exclusive Editing Session — both stand; only *when edits persist* changes) · ADR-014 (single-writer; the lost-update question this story re-answers at a longer window) · ADR-019/020 (lifecycle — untouched; the freeze stays on `published` alone) · ADR-008 (additive: one new endpoint, one new response field; every per-action endpoint stays live) · ADR-021 (media — untouched; photos stay out) · S4.10 (the history surface that inherits whatever the capture writes) · the glossary amendment (Editing Session = an exclusive *staging* context; Save Changes = the commit act) lands in `02-domain-model.md` at implementation.

## The pull, on the record

Founder report, 2026-08-09, on the running S4.17 build: reordered activities, pressed back without Save, found the change already persisted — *"nothing is saved up until save changes is pressed."* The label promises gating it does not do: every editor action persists per-action and Save Changes only releases the session. Two fixes were weighed openly at the ruling — relabel to `Done` (cheap, honest, keeps per-action crash-safety) or buffer for real — and the founder chose buffering. Grilled 2026-08-10 (grill-with-docs, two rounds, nine questions). The code sweep reshaped one open question before it could be asked: **activity-photo upload has been dead UI since S4.17** — the strip's only consumer was the retired day view, a routing test asserts the activity form omits it, and the wire plus its lease guard are alive with no screen reaching them. That was not a silent orphan: it is the S4.17 cull ruling already recorded on the epic map ("activity photos lose their only management UI"), so the photos question closed as moot rather than answered. Also load-bearing: **the app has no local persistence of any kind**, which makes the crash question a real trade rather than a checkbox.

## Goal

Inside the Draft Workspace, nothing the traveler does touches the server until Save Changes. Save Changes applies the whole staged plan in one transactional act, ends the session, and returns to the viewer; back-exit is a real discard behind a confirm. The label stops lying — by becoming true.

## Locked decisions *(founder, 2026-08-10, in grilling order)*

### 1 · Save Changes = commit + end session + exit, one act

The staged plan lands via one bulk write; the session releases; the viewer returns. With a clean buffer the button is a plain exit — no write, no confirm, no second label. Styling stays exactly as the S4.17 mock draws it (the bordered secondary CTA on the editor rail): the semantics change, the pixels do not.

### 2 · Back-exit with staged edits confirms

"Discard unsaved changes?" on every exit door — header back, hardware back, router. Confirming drops the buffer, releases the session, returns to the viewer; dismissing keeps the editor and the buffer. Silent discard was rejected because it burns exactly the traveler the founder was being — someone who pressed back assuming saved; keep-staged was rejected as a persistent draft in disguise (storage plus reconciliation, a different story).

### 3 · Crash, OS-kill and tab-close lose the buffer — accepted

Ordinary backgrounding loses nothing (component state survives); the loss window is process death, and it costs everything staged since the editor opened. No local persistence ships — it would be the app's first storage machinery plus a draft-vs-server reconciliation model, smuggled into a story about honest labeling. The mitigation is parked on the epic map with its trigger: a real report of lost work.

### 4 · The save is version-checked — never last-write-wins by default

The itinerary gains a `planVersion`; **every write that mutates the plan document bumps it** — the bulk save and each still-live per-action endpoint, so old clients' writes are visible to the check. The bulk PUT carries the base version the buffer was built on; a stale base refuses with a named code. The scenario that demands it, on the record: A stages edits, pockets the phone; renewal stops, the TTL lapses, B enters, edits, saves, leaves; A returns with the buffer intact and presses Save Changes. Buffering widens ADR-014's window — so this story owes the answer.

### 5 · The stale refusal offers two explicit choices

"This plan changed while you were away": **Discard my changes** (drop the buffer, reload the current plan, stay in the editor) or **Save anyway** — the visually quieter control — which re-submits against the current version, making the overwrite explicit, attributed, and race-safe (it is just a fresh version-checked save; the endpoint has one semantic, no force flag). Dismissal keeps editing. No merge UI — live-editing territory, parked where ADR-014 left it. Forced discard was rejected: it destroys up to a session of work to protect the other save, a loss accepted only for crashes, in a rarer case.

### 6 · Photos stay out — the open question closed as moot

No photo surface exists inside the editor to collide with the buffer: the S4.17 cull took the management UI out deliberately, and its epic-map line carries the trigger for photos' return (the Gallery / Photo Dump family). One clause joins that line: whoever re-homes photo upload now inherits the buffered-editor question — stated exception (immediate upload, outside the buffer) or staging — to be answered then, not here. ADR-021's ingest semantics are untouched.

### 7 · History captures the diff, at per-action granularity

At save the server diffs the committed plan against the staged plan and emits **the same typed entries per-action capture writes today** — day appended/renamed/deleted, activity created/edited/deleted, reorder — all attributed to the saver (exclusive session: one holder per save, so attribution loses nothing). Staged-then-undone churn never becomes history, ruled a feature: what was never saved never happened. The client narrates nothing — the server derives history from state it can verify. Capture cannot be backfilled; this is what S4.10 inherits.

### 8 · Scope is the plan — the seven paths

Append/rename/delete day · create/edit/delete activity · reorder. Two things reachable from inside the editor stay immediate, stated rather than assumed: **trip-field edits** (their own form, header lease, honest Save) and **invitations** (membership, not plan). Consequence recorded on the epic map: the dormant date-clear defect's trigger — "the first story that owns trip dates; S4.18's bulk endpoint is the nearest candidate" — **does not fire**, because the bulk endpoint carries days and activities, never trip dates; the trigger re-points to the first story owning the itinerary update path.

### 9 · The 48-red-walk repair stays parked — trigger checked, not fired

The epic map instructed checking its trigger at this spec; the founder ruled the repair a separate cleanup story. S4.18 still writes and greens the editor walks its own ACs need — that is ordinary verification, not the parked repair. The accepted cost, named: a create/publish regression introduced by this story would land in the existing red noise.

## Mechanics *(the decisions' consequences, settled at the grilling)*

- **The staged plan is a draft value, not an op log.** It initializes from the itinerary read after the session is acquired (base = that read's `planVersion`); the seven ops mutate it locally; dirty = draft differs from base; the save request *is* the draft. The activity form stages into this state and survives its navigation — the bulk of the client work, and why this is a story, not a tweak.
- **Full replace, reconciled by id.** Days and activities present-with-id update; id-less entries create; absent entries delete; array order is the order. A same-id day change is expressible on the wire (the capture's move entry covers it); no UI stages one at S4.18.
- **No temp-id reconciliation problem exists**, because Save Changes exits: the editor never renders a server response against staged ids.
- **Session rules at save.** The bulk PUT requires holding the Editing Session. A lapse mid-edit keeps the editor and the buffer (the renewal-failure alert stays informational); Save attempts re-acquire, then version-checks. A foreign holder at save gets the existing edit-locked refusal, buffer kept.
- **In-flight and failure.** Save disables while pending; any failure keeps buffer, session and editor with the error shown. Exit happens only on success.
- **The per-drop stale-reorder retry machinery dies** — staleness cannot exist when order is staged locally and committed once; its version check graduates to the whole plan.
- **Every entry affordance is unchanged** — the day pencil and blur-commit rename, the form's Save Activity, the delete confirms (S4.19 shipped them); only the persistence moment moves.

## Wire changes

**Additive only; no waiver.** New endpoint: `PUT /v1/itineraries/{id}/plan` — base `planVersion` + the full day/activity replacement; transactional; refusals are a new named stale-plan code (carrying the current version), the existing edit-locked code, and the existing archive/publish fence codes. New response field: `planVersion` on the itinerary, bumped by every plan-document write. Nothing renamed, retyped, removed or re-semanticized; the per-action endpoints stay live for installed clients.

## Candidate-capability note *(ADR-009)*

None — buffering re-expresses existing plan-edit acts through one endpoint; nothing footprint-growing, nothing gated, not governance.

## Deviations from the mock

None. The S4.17 frames ship pixel-unchanged; this story changes what Save Changes *does* — which is what the mock's label always claimed.

*(Amended at implementation, 2026-08-11 — one platform-forced deviation, stated rather than let pass as a choice.)* **The stale refusal's "visually quieter" hierarchy exists on native only.** Decision 5 asks for **Save anyway** as the quieter control; `Alert.alert`'s three-button form delivers exactly that. The web has no equivalent — `Alert` is a no-op there (the S1.3 trap) and S4.20 established `window.confirm` as the only dialog the browser rung actually shows — so the web fork asks the discard question first and the overwrite question second. Both choices are reachable and both are driven green, but *quieter* becomes *later*, and a traveler who declines the first dialog is asked the second rather than returned straight to editing. The real fix is an in-app modal owned by the app rather than the browser; it is not this story's scope, and it would be the natural home if the two-choice pattern recurs.

## Acceptance criteria

1. While the Editing Session is held, none of the seven ops produces a network write — verified by the driver's API-request log and the backend log's silence (the discriminating signal, never the render).
2. Save Changes issues exactly one plan write, after which a fresh read shows the staged plan, the session is released, and the viewer is shown. With a clean buffer it exits with no write and no confirm.
3. Back-exit with staged edits confirms; Discard leaves the server plan untouched (proven by reload) and releases the session; dismissing the confirm keeps editor and buffer. This holds on header back, hardware back, and web router back.
4. An activity created or edited through the form appears in the editor's staged plan immediately and on the server only after Save Changes — including create-then-edit and create-then-delete cycles entirely inside the buffer.
5. The stale-save refusal is proven at the IT seam under a controlled clock (stage → lapse → second writer saves → stale base refused, named code, current version carried), and its dialog is driven on the web rung with both choices observed working: Discard reloads the other writer's plan with the buffer gone; Save anyway lands the staged plan with the intervening edit gone and history attributing the final save to the saver. Two-account checks use the verified pool; state which tag played which role.
6. After a mixed save (day added, day renamed, activity created, activity edited, activity deleted, a reorder), history holds exactly the diff's typed entries attributed to the saver; a staged-then-deleted activity leaves no entry.
7. Every per-action plan endpoint answers unchanged and bumps `planVersion` — the coexistence guarantee old clients depend on, by IT.
8. Trip-field edits and invitations from inside the editor persist immediately, unchanged.
9. Killing the app with staged edits loses them and the server plan is untouched — the accepted behavior, walked once, on the record.
10. Dev-verified on the three rungs (API ITs green · emulator walk · web-preview container walk), including the editor driver walks this story adds; the device walk minds the LogBox-banner trap on the docked rail.

## Testing decisions *(the seams — highest existing ones, one new; confirm at owner review)*

- **The one new seam is the staged-plan module**: a pure module owning draft initialization, the seven ops, the dirty derivation and the save-request derivation. Table-driven Jest, no component harness — the `landingSlot` precedent (S4.17: extract the pure logic; importing the component pulls native init and kills the suite).
- **Controller IT seam** (existing, highest): the bulk PUT walks acquire → save → refusals on the S4.9/S4.17 lease-suite prior art — the mixed-op happy path, stale-plan refusal under the controlled clock, edit-locked for a non-holder, fence behavior on archived/published, **transactionality** (a failing save changes nothing — the half-saved plan is the bug buffering exists to prevent), and the diff → history assertion.
- **`planVersion` bump IT across every per-action endpoint** — the old-client coexistence guarantee, pinned where it would silently rot.
- **Migration:** one additive column with a default — no data migration, so no migration-stepping IT is owed (the `WorkspaceBackfillIT` pattern applies to backfills; stated so it is not wondered about).
- **Driver walks** (existing harness): stage-and-save, stage-and-discard (the confirm's wording printed by the S4.20 `window.confirm` stub), no-write-while-staging asserted on the request log, and the refusal dialog per AC 5.
- **The story gate is the highest seam**: the three-rung rule, external behavior only — wire responses and named refusal codes, never lease-row or buffer internals.

## Out of scope

Photo surfaces of any kind (the S4.17 cull line carries the trigger; its inheritor answers the buffering question) · local draft persistence (parked with its trigger) · merge or conflict UI (live-editing territory, ADR-014's line) · trip-field buffering and the date-clear fix (trigger re-pointed) · the 48-red-walk repair (checked, not fired) · cross-day move UI · any change to lifecycle, publish, visibility, or the freeze.

## Comments

*(append-only)*

**2026-08-11 — implemented and dev-verified across the three rungs.** Every AC closed; no deviations from the locked decisions.

- **AC 1 / 2 / 4 / 5** closed on the web rung by `mobile/scripts/drive-buffered-plan.js` — **21 passed, 1 known gap** against the preview *container* (the true build path), with the no-write assertion read off the CDP request log rather than the render, and the confirm wording printed by the S4.20 stub. **AC 5's Discard choice is driven as well as Save anyway**: it reloads the other writer's plan, stays in the editor, and the reloaded buffer then reads clean (a following Save Changes exits with no write and no confirm).
- **AC 3 is closed on two of its three doors, not three — stated rather than ticked.** Header back and hardware back both confirm (`usePreventRemove` intercepts the GO_BACK action). **The browser's own back button does not**: expo-router 57 does not route a raw `popstate` through `beforeRemove`, so the guard never sees it and the buffer is discarded silently — the founder's original complaint, on one door, in one rung. **The obvious fix was built and reverted**: trapping `popstate` and calling `history.forward()` desyncs the router stack from the browser's, which broke the activity-form round trip (3 walk failures where there had been 1). The buffer is still never *saved* by that route — nothing reaches the server — so the failure is lost work, not wrong work. Parked on the epic map with its trigger; the real fix is an in-app navigation guard that owns its own history, which is a story, not a patch.
- **AC 5 / 7** additionally closed at the API rung by `mobile/scripts/smoke-buffered-plan.js` — **15 passed, 0 failed** against the local stack on the verified pool. Roles: **t1 = the holder whose buffer goes stale, t2 = the intervening saver**. The stale refusal returns `STALE_PLAN` carrying `details.currentPlanVersion`, and re-submitting against that number is the whole Save-anyway path.
- **AC 6 / 7** closed at the IT seam: `PlanSaveHistoryIT` (diff → typed entries, no-op saves narrate nothing, entry *shape* pinned against a per-action write of the same op) and `PlanVersionBumpIT` (all eight per-action endpoints bump; reads, lifecycle and trip-field edits do not). Both have proven failure modes — deleting the reorder bump fails the sweep by name.
- **AC 9 walked once on the emulator, on the record.** Day 6 staged (server silent), `am force-stop`, relaunch: `planVersion` unchanged at 6, Day 5 from the prior save still present, Day 6 gone. The accepted loss, observed.
- **AC 3's hardware-back door is closed on the device, on the shipping exit path.** Stage a day → `KEYCODE_BACK` → "Discard unsaved changes?" → **CANCEL** keeps the editor *and* the staged day; **DISCARD** returns to the viewer having written **nothing** (backend log silent). Walked after the `abandonBuffer`/`popping` refactor, so the code that ships is the code that ran.
- **The emulator walk staged append + rename, not all seven ops** — the other five are covered on the pure seam (`stagedPlan.test.ts`), on the wire (the web walk), and structurally (`tabRouting` asserts no per-action mutation hook survives in the editor). Said plainly rather than ticked, because a tracker that overclaims misleads the next session with authority.
- **AC 10:** backend **582 ITs green**, mobile **Jest 2338 green**, `tsc` clean, emulator walk minding the LogBox banner, web preview walked in the container.
- **AC 8** holds structurally — the bulk endpoint carries days and activities only, so trip-field edits and invitations were never routed through it. The epic map's dormant date-clear trigger therefore did **not** fire, as decision 8 predicted.

**Three defects the walks caught that every green test missed**, all recorded as CLAUDE.md gotchas: expo-router unmounts the screen beneath a pushed one on web (releasing the Editing Session when the activity form opened — diagnosed from the *backend log*, not the render); a hand-rolled `history.pushState` exit guard desyncs the router stack (replaced with `usePreventRemove`, which is vendored at `expo-router/build/react-navigation/core` even though `@react-navigation/native` is not a dependency); and a driver entering the editor by direct URL fails a navigation assertion against a correct product.
