# S4.17 — Trip Workspace redesign: one home surface, one exclusive editor

**Status:** needs-triage · **Epic:** E4 · **Depends on:** S4.15 (shipped — the greyed CTA this story re-points), S4.13 (shipped — the lifecycle ladder this story surfaces), S4.9 (shipped — the leases this story reshapes), S3.3 (shipped — the media path the thumbnails ride)

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** ADR-022 (this story's decision record — the two-surface model, the soft lock, the Editing Session) · ADR-019/020 (three axes + the four-state ladder — **untouched**; the freeze stays on `published` alone) · ADR-014 as amended (the subject-typed leases this story supersedes for plan editing) · S4.15 (Trip/Itinerary split; the dead "Open Trip Workspace" CTA) · S4.9 (the planner + day surfaces this story retires; the version-checked reorder PUT the drag gesture drives) · S3.3/ADR-021 (authenticated media — never a bare `<Image>` URL) · the glossary amendments (Trip Workspace surface meaning · Draft Workspace · Editing Session · Finalize · Ready) land in `02-domain-model.md`.

## The pull, on the record

The founder brought the workspace mock set (2026-08-08, two CSS exports: `workspace.txt`, `add edit activity.txt`) for a render and reconciliation: *"every draft trip opens to here now."* The set was rendered 1:1 (`mock-render.html`), digested (`figma-mock-digest.md`), and grilled over four rounds plus a confirm. The epic map's "Trip Workspace redesign" backlog line — trigger already fired — pulls as this story. The poll frames in the set are **parked to E2** (no backend); the Notes tab is **cut**; the provider card is **archived as E6 input**.

## Goal

Every own unpublished trip opens into one **Trip Workspace** (viewer) showing its lifecycle honestly — badge, ladder CTA, day list — and all plan editing happens in one **Draft Workspace** (editor) behind **Edit Itinerary**, held exclusively by one traveler at a time. The planner, the read-only day view, and the old overview retire. The activity form takes the mock's shape. Wire change: one additive lease subject.

## Locked decisions *(founder, 2026-08-08, in grilling order)*

### 1 · Two surfaces replace three — the parked "three surfaces over one plan" question resolves

The **Trip Workspace** (the mock's `Finalized workspace` layout) is the home surface: every own **unpublished** trip opens here from the trips list and from S4.15's re-pointed "Open Trip Workspace" CTA, in **every** lifecycle state. The **Draft Workspace** (the mock's `workspace-draft` layout) is the editor behind **Edit Itinerary**. The planner (`days/index`), the day view (`days/[dayId]`), and the old overview (`[id]/index` as it exists) retire; their inbound references migrate (decision 12). **Published trips are excluded** — they keep today's published-view destination. **Archived** trips show the viewer with the existing unarchive banner (the entry point stays hidden per the S4.15 backlog line).

### 2 · The viewer is read-only and carries the whole lifecycle ladder — nothing stubbed

Badge + CTA per state: **Draft** (amber badge, no ladder CTA — Edit Itinerary is the act) → **Ready** (green) with **Start Trip** → **Ongoing** (blue) with **Complete Trip** → **Completed** (grey) with **Publish Itinerary** routing into the existing preview → publish flow. All three transitions wire to the shipped endpoints — the founder's initial "stub beyond Start" was reversed on the record once it surfaced that Complete/Publish are live acts whose current UI dies with the old surfaces (*"yes we can wire all three"*). Going back: **"Step back"** ships as a quiet text link under the primary CTA on ongoing/completed (one `reopen` rung per tap); Ready's step-back is Edit Itinerary itself (decision 3). Ongoing/Completed badges and Step back are **named deviations** — those states have no mock frames (epic-map line).

### 3 · Finalize is the traveler-facing act, Ready the traveler-facing state, and the lock is presentation

The Draft Workspace's CTA is **"Finalize Itinerary"** → the mock's confirmation sheet ("Ready to go?" / Finalize / Keep Editing) → the existing `finish-planning` act → back to the viewer showing **Ready**. The viewer renders Ready (and beyond) read-only; **Edit Itinerary on a Ready trip fires `reopen` and enters the editor in one tap** — the sheet's "locked … switch back to editing later" copy is honored as a *soft* lock built from existing transitions. The domain rule is untouched: the hard freeze belongs to `published` alone (ADR-019/020). Glossary amended: Finalize/Ready are the traveler-facing labels; wire and canon keep `finish-planning`/`upcoming`.

### 4 · The Editing Session — Edit Itinerary locks the whole itinerary; Save Changes ends the session

Pressing Edit Itinerary acquires an **exclusive whole-itinerary hold** (a new, additive lease subject). Holder = the traveler who pressed it. Other members see the viewer with Edit Itinerary disabled and "being edited by X"; server-side, their plan writes refuse while the session is held. **Save Changes** stays on the editor rail as the session's end — release + return to the viewer; it persists nothing, because every edit already saves per action (structure ops immediate, day title on blur, activity form on its own screen — unchanged). Back-exit releases too; the TTL self-heals abandonment. Founder's rationale on the record: *"live editing for collaborators is not implemented here"* — exclusive editing is honest until it is. Supersedes the subject-typed leases for plan editing (ADR-022; ADR-014's live-editing invalidating condition carries over). CTA order takes frame 1: Finalize above Save Changes.

### 5 · The tab row: six tabs, shared across both surfaces

**Day-by-Day · Polls · Travelers · Photo Dump · Chat · Details** — mock order preserved, Notes cut, Chat and Details appended (deliberate additions; the mock draws neither). Polls (E2), Photo Dump (Gallery), and Chat (S4.10) ship **greyed coming-soon** via the existing registry pattern; the S4.10 line's "Chat tab ships greyed" obligation moves to this row. The row is identical on viewer and editor and scrolls horizontally; only Day-by-Day's content differs between the two.

### 6 · Day-by-Day: read-only stubs on the viewer, the editing accordion on the editor

**Viewer:** collapsed day stubs, expandable inline to a read-only peek at activities. **Editor:** the accordion — single day open at a time, Day 1 expanded by default, tapping a stub expands it (chevron ⇄ minus) · activity rows with **drag handles** (decision 7) and pencil/trash · **Add Activity** per day · **Add a Day** appends via the existing endpoint, then expands the new day with its title focused · day titles edit inline (tap → input, save on blur — today's pattern) · **day delete** ships as a trash affordance in the expanded day's header row (named deviation — the mock draws none, and dropping it would regress a shipped capability; owner-only per the S4.9 interim ruling, unchanged). Empty states: a day with no activities shows just the Add Activity CTA; a trip with no days shows just Add a Day.

### 7 · Drag-to-reorder un-parks; the arrows graduate

The grip handles become a real drag gesture driving S4.9's version-checked `PUT /order` (*"arrows will graduate"* — the backlog line discharges here). The gesture-library decision (native lib + the weak-web-support fork weighed in that line) lands at the ticket; arrows remain the screen-reader path wherever they survive.

### 8 · The activity form takes the mock's five fields; four shipped fields cull, on the record

**Ships:** Activity Name · Time · Location/Venue · Estimated Price (**corrected** to a price input with a currency affordance — the mock's map-pin/"Search for a place..." is an export slip, per the digest) · Booking Link, a **pasted URL** into `externalUrl`. Add's secondary CTA is **"Cancel"** (corrected slip); Edit's is "Discard Changes"; primary "Save Activity" unchanged in behavior. **Culled** (founder: *"remove these"*, consequences named twice and accepted): Description, Notes & Creator Tips, Photos strip, Move-to-day. Wire fields stay additive; the orphaned-capability consequences are an epic-map backlog line. The **booking card's editing UI goes dormant** with them — the provider card frame is E6 input, not built (*"ignore this screen for now … just accept pasted urls"*).

### 9 · Travelers tab shows the roster; the flows stay one tap away

The tab renders the traveler list only; **tapping a row opens the existing member-management flows** (remove, leave, ownership offer). **Invite Traveler** lives on the workspace header (both surfaces' mock position) → the existing invite flow. Owner-only acts hide for members (Finalize, Start/Complete/Publish, Add a Day, day delete, Step back); activity editing stays member-wide — the server's authority rules are untouched.

### 10 · Details tab carries the plan details; the lifecycle field retires

Details shows the plan fields (destinations, dates, description, standouts, best time, cover) with the edit path to the existing edit screen; **the plan title also edits via the header pencil** (the mock's hidden `edit` icon, un-hidden). The old Details tab's "Where this trip is" lifecycle control **retires** — the badge + CTA rail own lifecycle now; two controls for one state machine is how contradictory UI happens. Publish/preview/archive controls live here where state-appropriate.

### 11 · "Original by" is fork provenance — hidden until forks exist

The subtitle renders only on a forked trip, naming the original owner (Fork Relationship, INV-6). No fork exists yet (S4.7), so nothing renders this story; the slot is reserved.

### 12 · Old-surface references migrate; the thumbnail extraction rides along

Re-point: S4.15's "Open Trip Workspace" (goes live), the trips-list card tap for all own unpublished states, publish-success's "Back to Trip Workspace", the preview's published-state button. The **`MediaThumb` extraction** discharges from the backlog into this story (its recorded trigger — this redesign — fired; five hand-copies of the S3.3 authenticated-image defence become one component).

## Deviations from the mock *(stated per the mock rule; full table in the digest)*

| Mock | Ships | Why |
|---|---|---|
| Estimated Price drawn as a location field | Price input + currency affordance | Export slip (copy-paste); the provider card's "₱PHP" shows intent |
| Add screen secondary CTA "Save Changes" | "Cancel" | Export slip; Edit's own "Discard Changes" is the pattern |
| Finalize sheet in `#FF6B35` + Inter | `#EA580C` + app families | Mock-set drift; one system |
| Notes tab | Cut | Founder ruling |
| No Chat/Details tabs | Added, Chat greyed | Founder ruling (S4.10 home; Details carries the plan fields) |
| No day-delete affordance | Trash in expanded day header | Regression otherwise; founder-approved deviation |
| No ongoing/completed frames | Badges + Step back, proposed values | Unmocked states; epic-map line awaits the mock pass |
| CTA order flips between draft frames | Finalize above Save | Frame 1 is the resting state |
| Poll frames · provider card | Not built | Parked E2 · E6 input |
| iOS status bar / home indicator | OS-drawn | Platform |

## Wire changes

**One, additive:** the edit-lease subject set gains an **itinerary-wide session subject** (acquire on Edit Itinerary · release on Save Changes/exit · TTL; plan writes by non-holders refuse while held; the "being edited by" advisory read covers it). Everything else this story does rides shipped endpoints: `finish-planning`/`start`/`complete`/`reopen`, publish flow, day/activity CRUD, the version-checked reorder PUT, rename-on-blur. No /v1 renames, removals, or semantic changes.

## Candidate-capability note *(ADR-009)*

None — this story adds no footprint-growing capability; it re-surfaces existing acts. The greyed tabs (Polls · Photo Dump · Chat) carry their candidate notes at their own stories (E2, Gallery, S4.10).

## Acceptance criteria

1. Every own unpublished trip — draft, upcoming, ongoing, completed, archived — opens the Trip Workspace; published trips keep the published view. S4.15's CTA is live and lands there.
2. The full ladder walks on the viewer: Finalize (via the editor + sheet) → Ready → Start Trip → Ongoing → Complete Trip → Completed → Publish (existing flow); Step back walks it down one rung at a time. Badges match state.
3. A Ready trip is read-only until Edit Itinerary, which reopens to draft and enters the editor in one tap.
4. While traveler A holds the Editing Session, traveler B sees "being edited by A" with Edit Itinerary disabled, and B's plan writes refuse server-side; A's Save Changes (or exit, or TTL expiry) releases; B can then enter.
5. The editor's accordion: expand/collapse, add day (appends + expands + focuses title), inline day rename on blur, owner-only day delete, add/edit/delete activity, and drag-to-reorder persisting through the version-checked PUT.
6. The activity form shows exactly the five mocked fields with the ruled corrections; saved values round-trip; the culled fields are absent.
7. Travelers tab lists the roster; a row tap reaches remove/leave/ownership; Invite Traveler works from the header. Member view hides every owner-only act.
8. The planner, day-view and old-overview routes are gone; no reference in the app reaches them.
9. Dev-verified on the three rungs (API · emulator · web preview) — the smoke rule; screenshots against the mock frames for the fidelity pass.

## Testing decisions *(the seams — highest existing ones, no new seams; confirm at review)*

- **Controller IT seam** for the Editing Session (ticket 01): the S4.9 lease suites are the prior art — acquire/refuse/release/expiry and the non-holder write-refusal walk the same path the subject-lease ITs walk today. External behavior only: wire responses and named refusal codes, never lease-row internals.
- **Unit seam** for the activity form's request builder (preserve-culled-fields — an untouched field stays untouched on the wire) and the corrected slips (price input, Cancel), plus the badge/CTA-per-state mapping (the `publishControls` pure-logic family is the precedent).
- **Component-behavior seam** for the accordion's single-open rule and the viewer's read-only guarantee (no edit affordance renders outside the editor).
- **The story gate is the highest seam** (ticket 08): the three-rung walk — API IT suite · emulator with two pool travelers · web preview through the container + `drive-preview.js` — per the smoke rule; green tests alone have hidden real bugs twice in this repo.

## Comments

*(append-only)*

**2026-08-08 — the mock set's font families resolve to Inter, at the mock's sizes and weights (implementation, ticket 02).** The set disagrees with itself: the `workspace.txt` frames draw Geist and Outfit, while `add edit activity.txt`'s own labels draw *"Inter 600 16"* and the finalize sheet draws Inter 800/400. The digest already ruled that split — *"Normalized to `#EA580C` + the app families"* — and the app's family is **Inter**, loaded in exactly the four weights the frames use (400/600/700/800). So every workspace surface ships Inter at the mock's verbatim sizes, weights and line-heights; the Geist/Outfit *names* do not render literally. **Named here rather than passed silently, and explicitly not claimed as platform-forced** — both families are installable from Google Fonts, so this is a one-system ruling inherited from the digest, not a constraint. Reversing it is one `@expo-google-fonts/*` dependency plus a token change, should the founder want the mock's literal families.

**2026-08-09 — the expanded day's collapse control is a chevron at the row's end, not the mock's inline minus (founder, on the running build).** Frame 1 draws the minus *inside* the title, immediately after the text (`gap: 8`). On a real device that reads as punctuation — an em dash in the middle of "Day 1: Lagoon Tour A —" — rather than a control, which is exactly how the founder reported it. It now sits at the **right edge** as a **chevron-up**, mirroring the collapsed stub's chevron-down: the same affordance in both states, pointing the way the card will move. **The control is not removed** — collapsing an expanded day has no other route — only relocated and re-drawn. *(Named per the mock rule: a deviation from a drawn frame, taken because the drawn position mis-reads on device.)*

**2026-08-08 — code review caught a real regression: members were locked out of plan editing (fixed).** The viewer passed `isOwner` where `editItineraryAction` expects **plan-edit authority**, so Edit Itinerary rendered `hidden` for every non-owner — and since the editor is now the *only* route to the activity form, members silently lost a capability the retired planner gave them ungated. Decision 9 is explicit the other way: *"activity editing stays member-wide."* Fixed by passing `canEditPlan(data)` and taking `isOwner` as a separate argument. **The reviewer also caught the subtlety that made the naive fix wrong:** `ItineraryService.reopen` is owner-gated server-side, so a member tapping Edit Itinerary on a **Ready** trip would have hit `reopen-then-edit` and failed with a 403 they could do nothing about. Members therefore see Edit Itinerary on **draft only**; on Ready and beyond it hides, because the act it would need is not theirs to perform. *(A member-facing "ask the owner to reopen" affordance is a candidate for the next workspace pass — not invented here, since the mock draws none.)*

**2026-08-08 — the retired routes keep resolving as redirect stubs, not 404s (ticket 07, review finding).** Deleting `days/index` and `days/[dayId]` outright left any existing `largata://itineraries/<id>/days?day=2` deep link dead-ending on *"Unmatched Route"* — which ticket 07's own line forbids (*"any `?day=` deep links (redirect to the workspace, day expanded)"*). Both paths are now two-line `<Redirect>` components carrying `?day=` through to the workspace, where `defaultOpenDay` expands that day. **The routes are retired as *surfaces*, which is what decision 1 asked for; the URLs stay honest.**

**2026-08-08 — a published trip redirects out of the workspace rather than rendering it read-only (ticket 07, review finding).** Decision 1: *"**Published trips are excluded** — they keep today's published-view destination."* `tripRowDestination` honored that, but two other doors (publish-success's back link and the preview's published-state button) push `/itineraries/[id]` directly, and the viewer rendered the workspace with the ladder merely suppressed. It now redirects to `/published/[id]`, so the exclusion holds **whatever door was used** rather than only the one the list controls. Archived-and-published still shows the viewer (the unarchive banner lives there, and archive dominates publish per ADR-017's audience ladder).

**2026-08-08 — ticket 06's recorded decision, made explicit: the `/members/[itineraryId]` route stays.** The ticket asked that the old members route's inbound links *"re-point or keep resolving (deep links must not dead-end) — decided and recorded here"*, and the decision is **keep resolving, unchanged**. The Travelers tab is a roster *list*; the member-management flows (remove, leave, ownership offer) are a screen's worth of guarded acts that decision 9 explicitly keeps *"one tap away"* rather than re-homing. A row tap pushes that route, its deep link still works, and no flow was rewritten.

**2026-08-08 — the greyed "Activity history" affordance leaves with the planner, and does not reappear in the workspace (implementation, ticket 07).** The `activityHistory` coming-soon key had exactly two call sites — *"View Activity History"* on `days/index` and `days/[dayId]`, both retired here. **The mock draws no history affordance on either workspace surface**, and the mock rule forbids inventing one, so the honest move is to retire the registry key with the screens rather than plant a greyed row somewhere to keep a test green. **Nothing is lost:** S4.9's capture still writes an `activity_history` row for every plan write (it was always *"written by everything and read by nothing until S4.10"* — V16's own words), so the data keeps accruing and **S4.10 owns the reading surface**, as it already did. The `tripWorkspace` key retires alongside it for the opposite reason — its CTA went live.

**2026-08-08 — the Details tab carries no *archive* control, because the mobile app never had one (implementation, ticket 06).** Decision 10 says publish/preview/archive controls live in Details "where state-appropriate". Unpublish, preview and view-published all exist client-side and ship. **Archiving does not: there is no `archiveTrip` in the repository and no `useArchiveTrip` hook** — only `unarchiveTrip`/`useUnarchiveTrip`, which the unarchive banner uses. The old overview did not offer archiving either, so **nothing regresses**; wiring a new archive act would be a capability this story did not scope. The unarchive path is untouched and still reachable through `TripArchiveBanner` on the viewer. *(Backlog: "archive a trip from the workspace" — the endpoint exists server-side and only the client act is missing.)*

**2026-08-08 — mock hexes ship verbatim, not through `tokens.ts` (implementation, tickets 02/03/05).** The tickets pin the workspace palette explicitly (`#EA580C`, the four badge pairs, `#ECE8E5`, `#757575`, `#E8613A`) and the deviation table normalized only `#FF6B35`. The app's terracotta accent (`#D96C4A`) is *not* substituted. The shared values are hoisted once into `src/itineraries/workspaceTokens.ts` rather than repeated per screen or merged into `tokens.ts` — the workspace palette is this mock set's, and folding it into the app tokens would silently restyle every other surface.
