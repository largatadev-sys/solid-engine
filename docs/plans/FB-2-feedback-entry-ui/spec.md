# FB-2 — Feedback entry UI: the FeedbackDock and the FeedbackSheet

Status: ready-for-agent
Date: 2026-08-28
Origin: grilling session 2026-08-28 (`/grill-with-docs`, three rounds; every decision below
was put to the founder and settled in-session). The design baseline is the founder's Claude
Design handoff — `Feedback Button.dc.html` (the interactive dock canvas), `Feedback Entry &
Report Flow.dc.html` (the form/error/thank-you canvas; its placement sections 01–04 are
superseded by the dock canvas), and the handoff `README.md` — archived under this story's
`design/` folder. Where this spec contradicts the handoff, this spec wins: every
contradiction is a grilled decision, and the strike-list in Further Notes enumerates them.

**Division of labor:** FB-1 shipped the backend and the client plumbing (the report draft,
the submit call, the failure mapper, the label registry, the repository). This story ships
the visible UI on top of it and changes nothing in the plumbing, the API, or the backend.

**Candidate-capability note:** none — same ruling as FB-1: filing feedback is deliberately
never gated (not footprint-growing, not governance; free on every tier, forever).

**Freshness note:** deliberately static — the flow is submit-only and renders no server
state; the thank-you is terminal (FB-1's spec already ruled this posture for the pipeline).

## Problem Statement

FB-1's pipeline is deployed and reachable, but nothing in the app opens it: the accept
endpoint, the outbox, and the relay all sit behind plumbing no screen calls. An alpha tester
who hits a bug has no way to report it from where it broke.

## Solution

One floating control — the **FeedbackDock**, a 40px draggable disc mounted once in the root
layout — exists over every screen, signed-out included, and opens the **FeedbackSheet**: a
bottom sheet with a problem/idea toggle, a description, up to three gallery screenshots, and
a terminal thank-you, wired to the shipped plumbing. The dock is **hidden by default
everywhere except builds pointed at deployed dev**; five rapid taps on the Largata wordmark
reveal it, and dragging it onto a dismiss zone hides it again. Both facts persist per
device. This posture is **permanent, not an alpha stopgap** (decision 9).

## User Stories

1. As an alpha tester on the dev build, I want a feedback bubble floating over every screen, so that I can report a problem from where it broke without hunting for an entry point.
2. As an alpha tester, I want to drag the bubble and have it snap to the nearer edge, so that I can park it where it does not bother me.
3. As an alpha tester, I want my parked position to survive relaunch, so that I fix the bubble's placement once.
4. As an alpha tester on a fresh device, I want the default position clear of the tab bar, so that the out-of-box bubble occludes nothing I navigate with.
5. As an alpha tester, I want the bubble dimmed when untouched, so that it never competes with the screen it floats over.
6. As an alpha tester, I want the bubble at full opacity for a beat after launch, so that I notice it exists before it recedes.
7. As an alpha tester, I want to drag the bubble onto a dismiss target to remove it, so that I can clear my screen entirely when I am done reporting.
8. As anyone who knows the gesture, I want five rapid taps on the Largata wordmark to reveal the bubble on any build, so that the reporter is reachable everywhere without being discoverable by accident.
9. As a signed-out visitor on the dev build, I want the bubble on the welcome, sign-in, verification, and join screens, so that "I can't get in" — where such bugs live — is reportable (FB-1 story 9, now actually reachable).
10. As a traveler who rotates the device or resizes the browser, I want the bubble to keep its proportional place, so that it never drifts under system chrome.
11. As a reporter, I want the sheet to collect only a type, a description, and optional screenshots, so that reporting takes seconds.
12. As a reporter, I want the type pre-set to Problem, so that the frustrated path — the one this exists for — needs no extra tap.
13. As a reporter, I want a character counter to appear only near the limit, so that I learn the cap before hitting it without staring at bookkeeping.
14. As a reporter, I want to attach up to three screenshots and remove any of them before sending, so that I can show the problem instead of describing it.
15. As a reporter, I want the screen I am reporting to stay visible behind the sheet, so that I keep the context of what I am describing.
16. As a reporter, I want an instant thank-you on submit, so that reporting a bug never itself looks buggy.
17. As a reporter on a bad connection, I want an honest "try again" with my form intact, so that my report is never silently lost.
18. As a reporter double-tapping send or retrying, I want exactly one report filed, so that my impatience does not spam the team.
19. As a reporter whose images are rejected or whose text is refused, I want the field at fault marked and Send held until I change something, so that I know what to fix instead of retrying into the same wall.
20. As a reporter mid-typing, I want a stray scrim tap, swipe-down, or back press to flash a warning instead of discarding, so that only the explicit close throws my paragraph away.
21. As a reporter, I want the sending state visibly held — dimmed fields, spinner with the word, close disabled — so that a slow submit never reads as a dropped tap.
22. As a signed-out reporter, I want no identity fields and an identical form, so that reporting demands no account.
23. As an Android user, I want hardware back with the sheet open to follow the same dismiss guard, so that back never navigates the app underneath or silently abandons a dirty form.
24. As a native typist, I want the sheet to rise with the keyboard, so that the field I am typing into is never covered.
25. As a screen-reader user, I want the dock announced as a labelled button, last in the reading order, so that it never steals first focus from the screen's content.
26. As a keyboard user on web, I want Enter/Space to open the sheet, arrow keys to nudge the dock, and a visible focus ring, so that the feature works without a pointer.
27. As a Reduce Motion user, I want springs and pops to become plain moves and crossfades, so that the information stays while the decoration goes.
28. As a founder demoing on the desktop preview, I want hover to wake the dock with a grab cursor and no idle fade under a mouse, so that the demo surface feels native to a fine pointer.
29. As a Playwright walk, I want the bubble absent unless a spec deliberately reveals it, so that the existing spec files never learn this feature exists.
30. As the one opt-in spec, I want a seeded flag and a real five-tap walk to reveal the bubble, so that both the revealed state and the gesture itself stay e2e-covered.
31. As a developer, I want the feedback module to own its motion constants and its store, so that it couples to no other domain and deletes in one place.
32. As a developer, I want visibility to fail closed on every unrecognized environment, so that a mistake degrades to a hidden bubble and never to contamination of tests or prod.
33. As the founder, I want the permanent posture and the public-launch gap written into the durable record, so that no future session rediscovers this conversation.

## Implementation Decisions

Numbered decisions record the grilling round/question that settled each.

1. **Web drag is press → jump-to-release; native keeps true 1:1 tracking** *(R1-Q1)*. The
   S4.38 gotcha (2026-08-27, unresolved) measured that on react-native-web `pointermove`
   stops after the first move while `pointerup` still arrives — so the web dock never tracks
   the pointer. It lifts on grab and, on release, springs to the slot nearest the **release
   point** (down + up coordinates are exactly what the broken stream delivers). Native,
   where real touch takes a different event path, tracks 1:1 and springs on release. The
   release math is shared, so a future S4.38 fix upgrades web to live tracking with no
   redesign. Do not re-attempt the causes S4.38 rules out; the untested portal-outside-the-
   RN-root dodge was offered and declined (R1-Q1b).

   **REVERSED 2026-08-29, by measurement, at the founder's LAN device walk.** The founder
   dragged the shipped bubble and reported it did not follow his finger. The premise above
   was then tested rather than trusted: instrumenting a `window` `pointermove` listener
   against the running preview counted **6 of 6 moves delivered, mouse and touch alike**, in
   both a synthetic dispatch and a real browser drag. S4.38's measurement stands for what it
   measured — `onPointerMove` as an **RN-web prop on a `View`** — but a **`window` listener
   is a different mechanism and is not affected.** The web dock now tracks 1:1, like native.
   Two changes were required, not one: subscribing to `pointermove`, and taking every value
   that shares the disc's transform **off the native driver**, because a native-driven value
   is owned by the native side and the drag writes it with imperative `setValue` every frame
   (the second defect S4.38's own notes list, hit here for real). `dockDragTracking.test.ts`
   pins both and is sabotage-checked. The lesson, which cost this story a shipped
   degradation: **a recorded gotcha bounds the mechanism it was measured on, not every
   mechanism that shares its vocabulary** — one probe would have settled it before the
   design decision was taken.
2. **Visibility is one persisted tri-state: `'default' | 'revealed' | 'hidden'`** *(R1-Q2,
   R3-Q2)*. `'revealed'` → visible; `'hidden'` → hidden; `'default'` falls through to the
   environment rule: visible **only** when the baked API base URL exactly matches deployed
   dev's — read via the API client's existing exported base-URL accessor, never a second
   `process.env` access (the Expo literal-inlining rule). Fail-closed by construction:
   localhost, the emulator alias, prod, a typo, an absent variable all fall to hidden. The
   reveal gesture always sets `'revealed'`; the dismiss always sets `'hidden'`; each beats
   the environment default in its direction.
3. **The reveal gesture is five rapid taps on the Largata wordmark, at two sites** *(R1-Q2,
   R2-Q5c; sites fact-checked — the sign-in screen renders no wordmark)*: the **welcome
   screen's wordmark** (signed-out) and the **Home header's wordmark** (signed-in). One
   shared hook wraps a pure tap-counter (five inside a rolling window, reset on a miss;
   clock injected — the S4.22 lesson on synthetic timestamps). These two call sites are the
   one deliberate piece of per-screen wiring in an otherwise global feature. The gesture is
   reveal, not toggle — it always sets `'revealed'`, so it also resurrects a dismissed
   bubble. The wordmarks change neither appearance nor accessibility semantics.
4. **Dismiss is drag-to-dismiss, not a standing X** *(R3-Q1)*. While a drag is live, a
   dismiss target (circled X) fades in at bottom-center of the frame; dropping the bubble on
   it — on web, releasing with the pointer inside the zone — sets `'hidden'`. No standing
   affordance rides the disc: its whole face is the open-sheet tap target, and a corner
   badge invites accidental hides.
5. **Geometry** *(R1-Q3)*. Horizontal is quantised: on release the bubble springs to the
   left or right rail, whichever its centre is nearer, at inset 16; it never rests
   mid-screen. Vertical is free within the clamp: safe-area top + 12 to safe-area bottom +
   12, both insets floored at 12 on web where the safe-area hook returns zeros. The
   **default** rest is the right rail at a constant bottom reserve of **96** — the mock's
   position on tabbed screens, chosen so the out-of-box position never occludes the tab bar;
   the clamp itself stays safe-area-only so a user may deliberately park over the tab bar.
   Drag starts after 4px of travel (below that it is a tap); 12px of overdrag past each rail
   while the pointer is down. Position persists as edge + a 0–1 vertical fraction of the
   clamped range, re-clamped on layout change.
6. **The sheet composes the members module's BottomSheet; the chrome is not rebuilt**
   *(R2-Q1, R1-Q4)*. The app's one generic sheet (Modal + scrim + travel + swipe-dismiss,
   already on the traveler sheet radius and the sheet motion tokens) gains one **additive**
   seam — an attempt-to-dismiss hook — so scrim tap, swipe-down, and Android hardware back
   (which arrives through the Modal's request-close path) all route through the same rule:
   dirty description → blocked, with a 300ms danger flash on the field border; clean or sent
   → close. Only the explicit close X discards a dirty form, and it discards outright. The
   description field's focus raises native keyboard avoidance on the sheet. Recorded
   deviation from the canvas (the mock-fidelity rule's escape hatch): RN-web's Modal anchors
   to the browser viewport, not the phone frame, so on a desktop preview the sheet spans the
   window — the standing behavior of every existing sheet in the app, not a new choice.
7. **Motion: one owned `feedbackMotion` block; no cross-domain borrowing** *(R2-Q2)*. The
   handoff's token names all exist but are scattered across six groups with duplicate names
   at different values. The sheet's chrome timings arrive via BottomSheet. Everything else —
   the dock constants (drag threshold 4, lift scale 1.08 / 120ms, snap 340ms at stiffness
   220 / damping 26 / mass 1, idle after 2600ms to opacity 0.4 over 400ms, wake 120ms,
   launch wake 2600ms, nudge 24px, the default bottom reserve 96) plus the feedback module's
   own copies of the chip-select, guard-flash, and banner timings — lives in one new
   `feedbackMotion` block in the workspace tokens module, so the feedback module depends on
   nothing owned by polls, chat, or live updates and deletes in one place. The **launch wake
   plays only when the dock is visible**.
8. **Persistence: one platform-split feedback store on the discovery recents-store pattern**
   *(R2-Q3)*. AsyncStorage is not in this app; the precedent is the discovery module's
   recents store — native writes a small JSON file through the file-system API, web uses
   localStorage behind the window guard. One store holds both persisted facts: the
   visibility tri-state and the dock position. Module-scoped access (the station pattern),
   read once at mount, every read and write guarded so an absent or corrupt value renders
   the defaults.
9. **The posture is permanent; there is no removal story; the public gap is a backlog line**
   *(R1-Q5, R2-Q4)*. The founder ruled the tap-reveal **persists past alpha**: the end-state
   on every non-dev build is hidden-by-default + gesture-revealed, which the fail-closed
   environment rule already produces with zero removal work. Consequence, written into the
   epic map: until a **discoverable public feedback surface** ships (backlog entry, trigger:
   public launch), ordinary travelers who don't know the gesture have no feedback path —
   FB-1's traveler stories are served for testers now, and for the public only by that
   backlog story, which reuses this sheet and plumbing wholesale and changes only the entry
   point. FB-1's spec carries a dated amendment recording this posture.
10. **The form, failure states, and thank-you follow the handoff verbatim.** Three fields
    only, no identity or metadata surfaced for anyone; type defaults to Problem; description
    hard-capped at 2000 with the counter appearing at 1,800 and crossing to the cap color at
    2,000; screenshots 0–3 with the add tile always last; Send inert until the description
    has a character; submitting dims the fields, holds close, and shows the spinner beside
    "Sending…"; failure renders one banner with the shipped failure copy **verbatim** —
    retryable failures relabel the button "Try again" (same draft, same report id,
    replay-safe), non-retryable ones hold "Send" inert and mark the field at fault
    (screenshots on 413, description on 400) until anything changes; every async completion
    is scoped to a session token so a stale response cannot strand the sheet (the
    delete-undo guard). The thank-you is terminal: check disc, "Thanks — that helps", "A
    real person reads every one of these. There is nothing else for you to do.", one Done.
    The draft is minted **on the tap that opens the sheet** and released only on success or
    explicit discard.
11. **Shipped-component changes, exactly two** *(fact-checked)*. The Button component
    already has a busy spinner state — the change shrinks to an optional `busyLabel`
    rendering the word beside the existing spinner. The Icon set gains `'feedback'` (the
    existing comment path plus stem and dot, per the handoff). Nothing else in shipped
    components moves; the form-field border inconsistency the handoff flags is explicitly
    **not** fixed here.
12. **Naming** *(handoff, kept)*. Components are `FeedbackDock` and `FeedbackSheet`; the UI
    says **feedback**, never **report** — the photo action sheet's "report" already means
    reporting another traveler's postcard. Accessibility: the dock is a button labelled
    **"Send feedback"**, 44 hit target, last in the reading order; keyboard users get
    Enter/Space to open, an arrow-key nudge that re-snaps and persists, and an accent
    focus-visible ring. Hover wakes it on fine pointers and the idle fade is skipped there.
    Reduce Motion per the handoff: the snap becomes a linear move, the lift loses its scale,
    rises become crossfades; the launch wake and idle fade stay.
13. **Bookkeeping** *(R1-Q6)*. Story **FB-2** in the epic map's FB-series. Branch
    `feature/FB-2-feedback-entry-ui`; commits `feat(feedback): FB-2 …`. The FB-1 amendment
    and the epic-map lines ride this branch; BUILD_STATUS's FB-2 row updates in the last
    commit before the merge, per the standing rule.

## Testing Decisions

Tests assert external behavior only — what renders, what persists, what the walk sees —
never internals. Seams, highest first, existing preferred (settled at R2-Q1/Q5):

- **Primary seam: the Playwright e2e walk against the preview container** — one new spec
  file, serial; nothing else in the e2e tree changes *(R2-Q5a, R3-Q2)*: the bubble is
  **absent** by default on Home (the explicit failure mode for accidental visibility — the
  walks alone would not catch it, by our own slot design) → seed `'revealed'` through the
  fixtures' existing post-load localStorage pattern (no init-script precedent exists; use
  the in-repo pattern) → reload → bubble present at the default slot → tap → sheet opens →
  type → submit against the local stack (logging relay) → thank-you → dismiss by
  pointer-down and release in the dismiss zone → bubble gone → five clicks on the wordmark →
  bubble back. The last leg makes the gesture itself e2e-covered, not just its storage key.
- **Second seam, existing: Jest pure modules** *(R2-Q5b)* — the drag-reorder work's
  extracted-math precedent, because the geometry cannot render under Jest: the dock geometry
  (nearer-rail choice, clamp, fraction round-trip, the 4px threshold, the dismiss-zone hit
  test), the reveal-tap counter (five inside the window, reset on a miss), and the
  visibility function (a case per lane × tri-state value). No new route exists, so the label
  registry needs no entry — the sheet is not a route, by design.
- **The one new code seam: the BottomSheet's attempt-to-dismiss hook** *(R2-Q1)* — additive,
  so every existing sheet keeps its current dismiss behavior untested-change-free; the
  feedback sheet's guard is asserted through the walk (blocked dismiss flashes, close X
  discards), not by unit-testing the hook's wiring.
- **Device walk** *(R2-Q5d)* for what no runner sees: the native 1:1 glide and spring, real
  tap-vs-drag feel at the threshold, keyboard avoidance, hardware back through the guard,
  Reduce Motion. The recorded workstation Gradle fault may block a fresh build; per the
  standing rule the walk then rides Metro on an already-installed dev build.
- The closing broad sweep (full Jest run) is owed before the PR: this story adds files under
  the mobile source tree (the S4.28 guard-suite rule) and touches two shared components.

## Out of Scope

- A discoverable public feedback entry point (epic-map backlog; trigger: public launch).
- Any change to the FB-1 plumbing, the API, or the backend.
- Fixing S4.38 (the epic map owns it) or re-investigating its ruled-out causes.
- The form-field border reconciliation the handoff flags.
- The header-slot and edge-tab placement variants (explored on the canvas, not chosen).
- Auto-captured screenshots, crash reporting, a "my reports" surface (FB-1 rulings,
  unchanged).

## Further Notes

- **Handoff strike-list** — claims in the design files corrected by fact-check or ruling, so
  no implementer trusts them: pointer capture keeping a fast web drag alive (S4.38: measured
  false); "PanResponder works through React Native Web" (S4.38: measured false); dock
  position on AsyncStorage (not in this app — decision 8); the Button lacking a spinner
  state (it has one; only the label beside it is new); seeding via an init script (the
  fixtures' pattern is post-load evaluation); the motion tokens as one flat namespace (six
  groups, duplicate names at different values — decision 7); the keyboard-withdraw and
  rail-height rules from the superseded static-placement canvas (deleted by the draggable
  design).
- The three handoff files plus `support.js` are the archived mock set for this story —
  founder places them under this story's `design/` folder.
- Stop-rule check: nothing here touches the guard, auth, schema, the ledger, publish
  semantics, or /v1 — no sign-offs owed.
