# E1 Promotion Gate — Epic 1, `dev → preprod → main`

**What this is.** The verification record for Epic 1's promotion — the first time the epic was read as a
single diff rather than story-by-story, and the first promotion this repo has run since Epic 0
(2026-07-17). Branches-only, like Epic 0: the `preprod` and `prod` *environments* still do not exist
(their standing-work line is unchanged), so this exercises the pipeline, not a deployment.

**Why a document and not a ledger line.** Epic 0's promotion carried no verification substance beyond
"the pipeline ran", so one off-epic ledger line held it. This gate produces review dispositions, a
five-layer regression run, two manual checklist executions and a two-account walk whose tag-role
convention explicitly demands a write-up. Under the standing rule — nothing load-bearing lives only in
a conversation — that needs a home the ledger line format cannot provide. This file is the **index of
dispositions**: parked findings live in the epic map, fixes live in commits, BUILD_STATUS carries the
one-line pointer. Nothing here is a second copy of anything.

---

## Scope, as agreed at the grilling (2026-07-29)

| Decision | Resolution |
|---|---|
| Purpose | The Epic 1 promotion gate, not an untethered confidence pass — so it inherits a stopping rule |
| Review base | **`git diff preprod..dev` — two-dot, tree-to-tree** |
| Review axes | Standards + Spec (epic-level), plus a dedicated cross-story seam hunt |
| Out of scope | The five parked architecture candidates (2026-07-29); relitigating the comment sweep |
| Known defects | Both pre-existing live defects fixed here rather than promoted |
| Maestro | Parked with a trigger; `REGRESSION_CHECKLIST.md` header amended to say so |
| Promotion | `dev → preprod` squash, `preprod → main` fast-forward, propose-first at both hops |

**Why two-dot and not three.** This repo squash-merges `dev → preprod`, so after Epic 0 the two
branches share **no commits** — their merge-base is the initial commit `e7e8b23`. Three-dot would
therefore drag all of Epic 0 back into the review: **441 files / 50,511 insertions** against the
correct **370 files / 28,647**. This is the cherry-pick footgun CLAUDE.md documents, wearing a
different hat, and it is the single most important mechanical decision in this gate.

---

## Review findings and dispositions

Three parallel reviewers: Standards (7 findings), Spec (5), cross-story seams (3 findings against 5
seams proven clean). Every load-bearing claim was independently verified against the source before
being accepted — several agent claims were corrected in the process.

### Fixed on `fix/E1-gate`

| # | Finding | Why it mattered |
|---|---|---|
| 1 | `itineraryOptions` used `initialData`, not `placeholderData` | **The gate's headline find.** Seeded the trip screen from the *unarchived* list and stamped it fresh against `staleTime: 30_000`, so a trip archived by another member rendered for 30 s with no badge, no banner and live Edit/Daily-schedule links — then failed with *"Someone is editing"*. Also rendered a populated plan as *"No days yet"*. Reached independently by the Spec and Seam reviewers from opposite directions. |
| 2 | The archived plan route showed *"Someone is editing"* | Known live defect. Fixed at **both** causes: `editLockedMessage` now has a `TRIP_ARCHIVED` branch, and `days.tsx`/`edit.tsx` gate the *route*, not just the callers — they no longer acquire a lease on an archived trip and render an archive notice instead. |
| 3 | `useMe` hand-rolled, firing three concurrent uncached `GET /v1/me` | Known live defect. Now a TanStack query with the public `{ state, refresh }` shape preserved, so no consumer changed. |
| 4 | `NotTripOwnerException` message lied at 3 of its 4 call sites | A non-owner tapping **Archive** was told *"Only the trip owner can remove a member."* Fixed with a private constructor + named factories, so **the compiler now enumerates every call site** — a structural fix, not a string edit. |
| 5 | `TripArchiveBanner` told non-owners to unarchive | Contradicted S1.9 decision 10 (don't advertise dead ends). The API message went role-neutral (*"This trip is archived and is read-only."*) and the UI, which knows the role, carries the actionable half. |
| 6 | Invitation expiry had zero test coverage on all three read paths | `InvitationService` called `Instant.now()` in ten places while `ClockConfig`/`MutableClock` existed and only `EditLeaseService` used them — so expiry was **untestable as written**. `Clock` injected; `InvitationExpiryIT` added covering accept, inbox, the owner's pending list, and re-invite-after-expiry. |
| 7 | The fence tripwire watched 2 of its 4 structurally-fenced doors | Ticket 03 claimed all four; only the ownership-offer pair was asserted. Invitation accept/decline now asserted too, with a membership-count check that a frozen trip admits nobody. |
| 8 | The comment sweep missed `mobile/scripts/` entirely | **339 prose lines across 9 files** — the rule read as held on its own accounting while a third of the mobile executable surface contradicted it, in exactly the files a future session copies as a template. Swept; usage knowledge preserved in `mobile/scripts/README.md` (a README is documentation, not source, so §10 needs no amendment). |
| 9 | The `archived` flag was echoed from the request param | Defensible by construction but **unfalsifiable** — claim and filter derive from the same input, and the existing test asserted the flag "matches the view requested", which is the tautology. Fixed by giving the check a failure mode: a new test verifies the flag against `workspace.state` **in SQL**. |
| 10 | Two dead `eslint-disable` directives | Mobile has no eslint config and no lint script, so they suppressed nothing. Removed as part of fix 2, which corrected the dependency arrays they were hiding. |
| 11 | Bookkeeping: S1.1's gate ticket still read "in progress" | Every box including AC 6 was ticked and closed. Corrected. |

**Found while fixing, not by the review** — three defects the sweep surfaced and one it caused me to check:

- **Two real Chrome DevTools port collisions** (`drive-preview` ↔ `drive-ownership-transfer` on 9223,
  `drive-archive` ↔ `drive-lifecycle` on 9224) — and the deleted comments **actively denied them**
  (*"not 9223 — drive-preview.js owns that"*). A live illustration of §10's own rationale: a comment
  has no failure mode, so it drifted while staying green. Each driver now owns a distinct port,
  overridable with `LARGATA_CDP_PORT`.
- **`smoke-api.js` and `seed-trip.js` hardcoded Node's `http`**, so the epic's broadest smoke script
  **could never reach a deployed `https` rung** despite reading `LARGATA_API_BASE_URL`. This silently
  invalidated the gate's own L5 plan. Both now pick the library from the URL, as `smoke-lifecycle.js`
  already did.
- **`drive-archive.js` read `PREVIEW_URL`** while its siblings read `LARGATA_PREVIEW_URL`. Unified.

### Pulled into the batch by owner decision — the lifecycle UI removal

**This is the one item in the gate that is not a defect fix, and it entered on an explicit owner
override of the scope line.** Recorded plainly because the line it crosses was drawn deliberately at
the grilling (*"defects in E1's deliverable get fixed, everything else gets a backlog line"*).

The trigger was legitimate and pre-registered. The backlog entry parked on 2026-07-29 said *"pull
earlier only if the three-banner trip screen becomes a demo problem"* — and the founder hit precisely
that, looking at the running build during this gate and asking why the banners were still there. My
recommendation was to promote first and pull it separately; the founder chose to include it. The
override is theirs to make, and the pre-registered condition means this is the park working, not
being ignored.

**Executed exactly to the parked scope, no more:**

- **Out:** the lifecycle banner and its date nudge, the Start/Complete flows, and the permanent state
  badge — on **both** the trip screen and the My Trips row, since a permanent "Draft" chip is noise in
  either place.
- **Demoted:** archive, from a prompting *"Done with this trip?"* card to a quiet **"Archive trip"**
  link. Nothing is lost with the card's body copy — the confirm dialog already says *"You can
  unarchive it at any time."*
- **Kept:** the archived notice and its Unarchive action, because that banner is what explains a
  frozen screen rather than prompting for bookkeeping.
- **Untouched:** the API (`/start`, `/complete`, the wire values — ADR-008) and all data
  (`started_at`, `completed_at`, V12, V13, the workspace mirror). `git status` confirms **zero backend
  files changed**.
- **Also removed, as dead code:** the two mutation hooks, the two repository methods, the two confirm
  wordings and `formatItineraryState`, each of which had exactly one caller — the deleted UI. Client
  code carries no additivity obligation, and leaving them would be the speculative generality P9
  rejects. All recoverable from git; the *endpoints* are what ADR-008 protects, and they survive.

**Verified for both roles on the device, not just in tests:** the owner sees the quiet link and no
banners; a member sees neither; an archived trip still shows the badge, the notice, and Unarchive for
the owner alone. Mobile suite **560/560** (down from 594 — the removed lifecycle tests went with the
feature they tested), `tsc` clean.

**Re-verified on every layer the change touches**, since a UI removal is only proven where it renders:
the preview container was **rebuilt through the true build path** and `drive-archive` re-run
**22/22**, `smoke-api` re-run **46/46** on the local stack.

**And the re-run earned its keep — it exposed two weaknesses in the driver itself.** It matched the
archive control by *exact* inner text `'Archive'`, so the new `'Archive trip'` label meant the tap
silently missed and **eleven downstream checks cascaded**, reporting a broken product when the product
was correct. Worse, its frozen-surface check asserted the *words* `'Daily schedule'` were absent —
conflating *"the link is gone"* with *"the words are gone."* An archived trip is **supposed** to keep
showing its plan read-only, so that check only ever passed because the fixture had no days; the moment
one existed it failed on correct behaviour. It now enumerates the genuinely clickable elements and
asserts `Edit` and `Daily schedule` are not among them, printing the survivors
(`["Unarchive","Members"]`) in its output — so a pass now means the affordances are gone, not merely
that a string is missing. Same family as this repo's recurring lesson: **a check whose two outcomes
are indistinguishable proves nothing**, and this one had drifted into exactly that.

### Rejected on the record

- **`V13__workspace_state.sql`'s comment names `WorkspaceStorageIT`; the class is
  `WorkspaceStateStorageIT`.** **Not fixed, deliberately.** Flyway checksums migration content, so
  editing an applied migration passes on a fresh local DB and **fails validation on every rung that
  has already run it** — green locally, dead on deployed dev. This is why 06b §10 puts migrations
  permanently out of the comment policy's scope. The stale name stays; correcting it would be the
  more expensive error.

### Parked with triggers → `docs/design/07-epic-map.md`

Three findings, each recorded with its evidence under *"E1 promotion gate 2026-07-29"*: the `listMine`
unbounded access path and now-dead keyset index · the copy-pasted platform-dialog forks · the twin
`NotTripOwnerException` class names.

### Found by running the rig, not by reading it

Three defects surfaced only because a layer was actually executed, and all three share the shape this
repo keeps re-learning: **green at the layer that is convenient, dead at the layer that ships.**

- **A UTF-8 BOM in `InvitationService.java` passed `mvn verify` on the host and killed the container
  build.** A PowerShell `Set-Content -Encoding utf8` planted it. All **309 ITs passed**; `docker
  compose build` died at `illegal character: '﻿'`. Since the Docker build is what Railway runs,
  this would have cleared every gate we had and broken the deploy. A second BOM in
  `itineraryQueries.ts` passed `tsc` **and** 592 Jest tests, because TypeScript tolerates one
  silently. Now guarded on both sides by tests **proven to fail** against a planted BOM
  (checklist #10).
- **`smoke-api.js` and `seed-trip.js` hardcoded Node's `http`.** The epic's broadest smoke suite could
  never reach an `https` rung despite reading `LARGATA_API_BASE_URL` — so it had **never once run
  against deployed dev**, and this gate's own L5 plan was invalid before it started. Fixed in two
  passes: the first missed the malformed-token probe, and the run then failed *four checks in, after
  reporting four passes* — the worst shape a probe can fail in. Only running it found either.
- **Two real Chrome DevTools port collisions the deleted comments actively denied.** `drive-preview`
  and `drive-ownership-transfer` both took 9223; `drive-archive` and `drive-lifecycle` both took 9224
  — while the comments said *"not 9223 — drive-preview owns that."* A live demonstration of §10's
  rationale: a comment has no failure mode, so it drifted while staying green. Each driver now owns a
  distinct port, overridable with `LARGATA_CDP_PORT`.

### Harness note for the next session

**`adb shell input text` re-parses the string in the device's shell.** The pool password contains `!`,
and an unquoted send produced **16 characters for a 15-character password** — the sign-in failed with
*"Email or password is incorrect."*, which reads as a wrong credential rather than a mangled one.
Single-quote it for the device shell: `adb shell "input text '$PASSWORD'"`. Same family as the Git
Bash path-rewriting trap already in CLAUDE.md, and it cost the same kind of detour here.

### Minor, recorded not fixed

**Deep-linking straight to `/itineraries/{id}/edit` on a locked trip leaves the form on screen.** The
lock alert fires correctly (*"largata.dev+t1 is editing this itinerary right now."*) but the
`router.back()` that follows has no history to pop when the route was entered directly, so the edit
form stays rendered. **Safe** — every write still fails the server's `requireHeldBy` check, so this is
cosmetic, and it is **pre-existing S1.4 behaviour, not introduced here.** It is also not a path a
traveller reaches normally: `/edit` is entered from the trip screen, where back works. Fixing it would
mean gating the route on lock state the way this gate now gates it on `archived` — reasonable, but
scope creep at a promotion gate. **Trigger: the next story that touches the edit route.**

### Parked: S1.2 AC 10/11 — the transactional invitation email

**Owner decision, 2026-07-29, and the reasoning is worth keeping because my first recommendation was
wrong.** The gate surfaced that `ResendInvitationMailer` binds only when `largata.resend.api-key` is
present — a property that appears **nowhere in the repo** — so every test, smoke run and device walk
in Epic 1 used `LoggingInvitationMailer`, and S1.2's gate ticket has said *"partial"* since
2026-07-22 while BUILD_STATUS said ✅.

I initially recommended provisioning Resend before promoting, on the grounds that the epic's only
outbound integration would otherwise first execute in `preprod`. **The owner asked what Resend
actually does, and that dissolved the argument:** the `Invitation` entity has **no token column**. The
invitee never redeems a link — they sign in, and `inbox()` matches pending invitations against their
*verified email address*. The mail is a **doorbell, not a key**. Nothing in the core loop depends on
it; the bean is config-gated off, so promoting ships a dormant class rather than a broken feature.
(It is also precisely why the verified pool and `seed-trip.js` work at all — the accept path is
authenticated-email-matching, so it is drivable without an inbox.)

**Parked to pre-alpha with the Play-track and prod-rung cluster**, where SPF/DKIM on `largata.com` is
the same species of work. The consequence, stated so it stays a decision: **an invitee learns of a
trip only by opening the app.** Fine while invitees are people you can text; a real hole the moment
they are not. The epic map's E1 line, which described a "single-use token, transactional email" that
was never built, is corrected in the same edit.

---

## Regression run — all layers green

| Layer | What it proves | Result |
|---|---|---|
| L1 — automated suites | `mvn verify`, `tsc`, Jest | ✅ backend **309 ITs, 0 failures**, BUILD SUCCESS · mobile `tsc` clean, **592 tests / 28 suites** |
| L2 — local full stack, fresh DB | `docker compose up` + `smoke-api.js` + `seed-trip.js` over the real invite→accept | ✅ **46/46**; trip `019fac0d…4d70` seeded through the genuine invite → inbox → accept, no planted rows |
| L3 — web preview container | The true build path (`npm ci` + export in-image) and true server (Caddy) | ✅ `drive-preview` clean (page text present, **Google iframes: 1**, no console/page errors) · `drive-archive` **22/22** · the edit-lock modal captured verbatim |
| L4 — two-account narrative walk | The seams between stories, which no per-story test starts from | ✅ see below |
| L5 — deployed dev | `smoke-api.js` against `api-dev.largata.com` | ✅ **46/46** — the first time this suite has ever reached a deployed rung |
| Checklist #4 | Google sign-in on a device, through the real picker | ✅ GMS `SignInActivity` + `AccountPickerActivity` on screen, account chosen, then the **discriminating** half: `Traveler provisioned: id=019fac3d…` in the backend log and a new `traveler` row for the base Google address |
| Checklist #5 | The secret hook still blocks planted specimens | ✅ all six formats blocked (`AIza…`, `sk_live_…`, `ghp_…`, `AKIA…`, PEM, JWT); HEAD unchanged, tree clean afterwards |

**On L5 and deploy currency.** `/v1/health` returning `{"status":"ok"}` proves nothing about *which*
build is deployed — it is the indistinguishable-probe shape this repo has been burned by three times.
The discriminating signal is inside the suite: its S1.9 archive checks pass, and
`/archive`, `/unarchive` and the `archived` list dimension **do not exist in any pre-S1.9 build**. So
deployed dev is confirmed current with `dev` by a probe whose failure mode is stated.

### The L4 walk — `t1` = trip owner, `t2` = invited member

One continuous narrative on the emulator (dev build, JS from Metro on 8082, backend at `10.0.2.2:8080`),
driven through the UI rather than the API wherever the point was what a traveller sees.

1. **t2 signs in and My Trips lists "E1 gate walk"** — a trip t2 *joined*, never owned. S1.6's
   membership-scoped list, proven on a device rather than in an IT.
2. **t1 archives the trip while t2's list is cached; t2 taps in.** The screen shows the **Archived**
   badge, the banner *"This trip is read-only. Only the trip owner can unarchive it."*, **no Unarchive
   button** (correctly withheld from a member), and no edit affordances. This is the exact
   reproduction of the headline defect: under `initialData` this screen rendered as a live, editable
   trip for thirty seconds and then failed with *"Someone is editing."* Screenshot captured.
3. **Deep-link into the archived trip's plan** (`largata://itineraries/{id}/days`) — renders
   *"This trip is archived / Archived trips are read-only."* where it previously claimed a phantom
   editor. The second known live defect, closed on the surface it lived on.
4. **t1 unarchives; the trip thaws for t2**, and **t2 — a member, not the owner — creates Day 1**,
   confirmed in SQL. S1.3 collaborative editing over S1.2 membership.

**One observation, not a defect.** Mid-transition the app briefly showed a stale *"Someone is
editing"* alert. Investigated rather than assumed: the `edit_lease` row named **t2 itself** as holder,
and the server returns **200** when the holder re-acquires (idempotent renewal), so the lock is
behaving correctly. On a clean app start the same route renders the editable plan. The alert was a
leftover dialog from the archived→unarchived transition, not a reproducible state.

### The L4 walk — roles, stated up front

Per S1.5's rule that a test identity must identify itself: **`t1` = trip owner / offeror / remover ·
`t2` = invited member / offeree / new owner.** One continuous narrative, because the thing no story
ever tested is the *sequence*: create → invite → accept → both see it in My Trips (S1.6) → lease taken
and single-writer proven (S1.4) → days and activities (S1.3) → ownership offered and accepted, roles
swap (S1.6) → removal and leave (S1.5) → start → complete (S1.7) → archive, fence proven by a
genuinely rejected write, unarchive (S1.9).

---

## Promotion record

*(Filled in at the promotion; the closing SHA line rides a `docs/` branch after, since it cannot exist
before the merge it describes.)*

- `dev → preprod` squash SHA: —
- `preprod → main` fast-forward: —
- `git rev-parse main preprod` equality proof: —
