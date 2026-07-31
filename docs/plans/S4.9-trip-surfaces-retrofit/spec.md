# S4.9 — Trip surfaces retrofit · spec

**Status:** intent locked 2026-07-31 — grilling session (grill-with-docs), founder-confirmed. Immutable point-in-time intent (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** The 07/31 trip-creation/workspace mock set (this story's design input — `create-trip-entry` · `trip-info-form` · `trip-editor-days` · `trip-workspace` · `invite-travelers` · `collaborative-edit` · `fork-itinerary`, wireframe + styled; archived render: [`screens-render.html`](screens-render.html), reviewed via the session's artifact) · 02 (**Edit Lease** as amended · **Activity History Entry** · **Active (workspace)** · **In-trip Chat** reserved) · **ADR-014 as amended 2026-07-31** (subject-typed leases — this story builds the amendment) · ADR-015 (handles — invite-by-handle is the first real consumer) · ADR-013 (day-indexed plans; duration→seeded days shipped at S1.3, confirmed unchanged) · ADR-008 (waiver renewed for the write-endpoint semantics changes, clients founders-only) · S1.3 (authority split — narrowed here for day CRUD, interim) · S1.4 (the whole-itinerary lease this story re-scopes) · S1.9 (`WorkspaceState`, the fence) · the epic-map lines this session touched (live-editing/activity-history re-slice · friend graph placeholder · chooser re-confirm · drag-to-reorder re-confirm · member day add/delete revisit line) · register #2 (analytics call sites on every greyed affordance).

## The pull, on the record

The founder brought the 07/31 mock set for reconciliation against the implementation. Ruling one set the standing: **the mock is the design baseline for the trip surfaces** (the S1.3/S4.0 discipline) — every conflict with canon got an explicit ruling, and future-story elements ship greyed **only when the owning story is scheduled**. Two rulings reverse recorded decisions on the record: **ADR-014's lock scope** (whole-itinerary → subject-typed leases, superseding that grilling's own rejection of per-item locks by answering its "partial protection" objection structurally) and **the 2026-07-24 no-planning-conversation ruling** (in-trip chat enters launch scope as S4.10 — a new workspace surface, not a resurrection of the deleted private Comment). One decision narrows a shipped authority split *interim* (owner-only day add/delete, revisit at the validation gate).

**The trade taken, named honestly:** the ADR-008 waiver is renewed a second time — shipped /v1 write endpoints change semantics again (finer lease checks, owner-only day CRUD, version-checked reorder) while the only installed clients are the founders'. And the retrofit reopens **every plan-write path** at once; the compensation is that activity-history capture rides the same pass for near-zero marginal cost.

## Goal

The trip surfaces meet the product the 07/31 mocks describe: a workspace screen that reads as a shared place (members, state, tabs), one day surface where a group genuinely plans in parallel — each activity individually leased, nothing silently overwritten — an invite screen that speaks handles, and a navigation frame the social surface (S4.3) will fill. Everything a member does is attributed and, from this story on, captured in an append-only history.

## Locked decisions *(grilling 2026-07-31, in decision order)*

### 1 · The 07/31 mock set is the design baseline

Adopted with the S1.3/S4.0 discipline: conflicts ruled (below), future elements greyed only when scheduled, undecided flows parked with their owning stories. The render is archived beside this spec; the raw Figma CSS export can be dropped in alongside if wanted.

### 2 · The lock unit is the Activity — ADR-014 amended, built here

The lease becomes **subject-typed**: `header | day | activity`, one table, original per-row semantics (holder + expiry, ~3-min TTL auto-renewed, release on save/cancel, expiry the real guarantee, no force-take, guard-then-lease on every plan write). Specifically:

- **Activity lease** — guards that activity's field edits and its **deletion**.
- **Day lease** — guards the day's own fields (title, member-editable) and its deletion; it does **not** imply the activities inside (that would be the day-scoped model the founder ruled against).
- **Header lease** — guards title/destinations/dates/description; the field-edit surface keeps its acquire-on-entry flow.
- **Adds are unguarded** (day and activity) — additions commute; nothing is overwritten.
- **Delete day** requires the day lease **and** rejects (409, naming the holder) while any contained activity is leased by another member.
- **Reorder is version-checked, not leased** — the whole-list PUT carries the ordering it believes current; stale → 409 → refetch and re-apply. **No write in the model can silently overwrite another.**

### 3 · Add/delete day is owner-only — interim

Founder ruling, "for now": narrows S1.3's members-edit-plan-content split on shipped endpoints (ADR-008 waiver renewed). The "+" day chip renders owner-only; activities stay member-editable throughout. Revisit trigger: **the validation gate** (epic-map line records it).

### 4 · The lock indicator is pull-based and advisory

Lease holder identity (handle + avatar) becomes additive fields in plan read payloads. The "*Being edited by @…*" border renders from the last fetch — staleness up to a refetch interval accepted — and **never disables the tap**: a stale indicator must not block an edit the server would allow. The failed-acquire modal remains the enforcement surface. Not presence: no sockets, no push, no broadcast.

### 5 · Activity-history capture ships here; the surface waits at S4.10

An **Activity History Entry** (append-only: actor, act, subject, at) is written on every plan write — pulled ahead of its reader because capture cannot be backfilled (the S1.3 attribution rule) and this story reopens every write path anyway. The mock's "View Activity History" link ships **greyed** (analytics on tap); the reading surface is S4.10's. The publish-scrub feed obligation (UX flow 12) travels with the entity.

### 6 · Chat enters launch scope — tab greyed here, story at S4.10

Reverses 2026-07-24 on the record. The workspace tabs ship **Itinerary / Chat (greyed, `comingSoon` + analytics) / Details**. S4.10 (after S4.3) owes a UX flow and its own grilling before elaboration; the deleted private Comment stays deleted; public Comment (S4.6) unaffected.

### 7 · The status chip is the workspace state; the count is the roster

Green dot + "Active" renders `WorkspaceState.ACTIVE`; an archived trip renders the archived variant in the same slot (replacing today's badge). `COMPLETED` stays unrendered (the inert S1.7 mirror, parked until S4.1). "5 members" derives from the roster and taps to the members screen. Glossary now pins: **UI "Active" = workspace state, never the dormant itinerary-lifecycle `active`.**

### 8 · The workspace screen structure is adopted, with redistribution

Eyebrow (**PRIVATE WORKSPACE** — the visibility field; S4.1 decides the published variant) · title · avatar stack → members screen · state chip + member count · tabs · Itinerary tab = day-summary cards ("Day 1: Arrival — 2 activities" → the day surface) · bottom **Invite Travelers** CTA. **Details tab** takes the trip fields + Edit (header lease), the quiet archive link, and leave/transfer actions. The **archive and ownership-offer banners stay above the tabs** — interrupts, not content: an archived trip explains itself before anything else.

### 9 · One day surface, two doors

The chips editor **is** the day screen: create-flow Continue lands on Day 1; a workspace day card lands on that day's chip. The `collaborative-edit` mock is this same screen's decorated state (lock borders, attribution chips); its separate back-header chrome is dropped. On this one screen: "+" chip owner-only · FAB (add activity) for every member · grip handle stays deferred (arrows remain; the gesture-library backlog line unchanged) · kebab = activity actions, delete requiring the lease. The settings gear routes to the Details tab.

### 10 · Invite-by-handle ships — exact match only

The first real consumer of ADR-015: a handle-lookup endpoint (**exact match** — fuzzy people-search is S4.3 discovery territory and an enumeration surface this story refuses), an additive `invitee_traveler_id` addressing mode on Invitation, and the inbox matching on **id or verified email**. The email path and Pending state are S1.2, re-skinned.

### 11 · "From Your Network" is the friend graph's honest placeholder

Founder call: keep the section visible, never cut. It renders an **empty state in words** ("friends you add will appear here" — final copy at the ticket), never sample rows — nothing on a shipping screen may look like data that isn't. Analytics on view/tap: the alpha measures demand for the post-validation graph for free.

### 12 · The tab bar ships: Trips / + / Profile live; Home and Search greyed

Expo-router restructures into a tab group now, while every screen is already being touched. Home (feed) and Search (discovery) grey with `comingSoon` + analytics until S4.3 fills them — the next-but-one story, a short-lived grey. The app opens on **Trips**.

### 13 · The create flow, field by field

- **No chooser until S4.7** (re-confirms the S1.3 ruling): **+** routes straight to Trip Details; S4.7 supplies the second card and activates the chooser.
- **Destination: single free-text field** at create (the placeholder drops "Search" — Place Search is register #9's reserved term); submits a list of one; the Details tab keeps the full multi-destination edit.
- **No dates at create** — duration only (ADR-013's shape; the mock is right, the current form changes); dates stay editable from the Details tab.
- **Cover Photo: greyed** (`comingSoon` + analytics) until S3.3; the field is already designed into S4.1's API shape.
- **Continue lands on the day editor, Day 1** — duration has just seeded the days (shipped S1.3 behavior, confirmed unchanged).

### 14 · Fork screens park to S4.7, with three notes attached

*(a)* the Tentative-Dates/Duration pair (fork derives day count from the source; dates are its only open field) · *(b)* the source-card rating depends on S4.5's order within E4 · *(c)* the attribution notice copy is INV-6. Frames archived with this spec.

### 15 · S4.9 goes next in the E4 pull

**S4.9 → S4.1 → S3.3 → S4.3 → S4.10 → S4.4–S4.8.** Publish will live on the retrofitted workspace screen; building it first would build it into chrome that changes one story later.

### 16 · Candidate-capability note *(ADR-009's standing duty)*

**No new candidate.** Invite-by-handle rides `invitation.send` (already on ADR-009's map — the addressing mode changes, the act doesn't); all other acts here edit existing footprint or are governance; history capture is system bookkeeping, not a traveler act. S4.10 will record `chat.message.send`.

## Backend scope

Lease table re-shaped to subject-typed rows *(leases are ephemeral minutes-scale state — the migration may drop and recreate rather than convert; nothing durable lives there)* · lease enforcement re-pointed per subject on every plan-write endpoint · owner-only day add/delete · delete-day collision guard · version-checked reorder · `activity_history` table (additive) + an entry per plan write · additive read fields: lease holder per subject, last-editor handle on activity payloads · handle-lookup endpoint (exact match) · additive `invitee_traveler_id` on invitation + inbox matching on id or verified email.

## Mobile scope

Tab-group routing (Trips / + / Profile live; Home, Search greyed) · workspace screen restructure per decisions 7–8 · one day surface per decision 9 · invite screen per decisions 10–11 · create form per decision 13 · lock indicator rendering per decision 4 · greyed chrome all through the existing platform-forked `comingSoon` helper, each with a register-#2 analytics call site.

## Console & infra work

None — no new external services, no new secrets, no OAuth/console surface. (Named explicitly per the S0.6 lesson.)

## Harness impact

The concurrent-edit ACs need the verified pool's multi-account walks (`t1` owner, `t2`/`t3` members — state which tag played which role, per the standing rule). `drive-preview.js` gains lookups for the new screens; the web walk covers the tab bar, workspace tabs, and the greyed affordances (a grey that dead-clicks on web is the S1.3 bug reborn).

## Acceptance criteria

1. Two members edit **different activities of the same day** concurrently; both saves land (device + preview, pool accounts).
2. A member entering an activity another member holds gets the modal; the server rejects a lease-less write (IT).
3. Deleting an activity requires holding its lease (IT).
4. Deleting a day while another member holds a contained activity's lease → 409 naming the holder (IT).
5. A member's day add/delete → 403; the owner's succeeds; the "+" chip is absent for members (IT + UI).
6. Trip-field edits acquire the header lease; a concurrent field edit is rejected (IT).
7. A stale reorder → 409; the client refetches and re-applies; a fresh reorder persists and survives refresh (IT + UI).
8. The lock indicator renders the holder's @handle from a pull and **never disables the tap** — tapping a stale-expired lease acquires successfully.
9. Every plan write produces exactly one history entry with actor/act/subject (IT); no reading surface exists.
10. The workspace screen renders state chip (Active/Archived from `WorkspaceState`), roster count, tabs; an archived trip explains itself above the tabs, for owner and member.
11. Chat tab, Home, Search, cover drop-zone, network section, history link: each greys with the shared helper, fires its analytics event, and dead-clicks nowhere on web (driven in the preview container).
12. The app opens on Trips; + lands on Trip Details; Continue (title + duration, no dates) lands on the day editor at Day 1 with the seeded days.
13. Exact-handle lookup finds `@t2`'s account and invites it; the invitee's inbox shows the invitation (id-matched); a partial handle finds nothing; the email path still works end-to-end.
14. Attribution chips render "@handle · relative time" from the additive payload fields.

## Out of scope

Publish (S4.1) · chat build + history surface (S4.10) · fork + chooser activation (S4.7) · cover upload (S3.3) · friend graph (post-validation) · presence/live editing (post-gate; ADR-014's leases stay built to be discarded) · drag gesture (its backlog line, arrows remain) · Home/Search content (S4.3) · any entitlement code (ADR-009) · permanent deletion (its parked line).

## Comments

*(append-only; intent above is immutable)*

### 2026-07-31 — decision 13's "no chooser until S4.7" is reversed: the chooser ships now, fork greyed (founder-ruled, at the device walk)

Decision 13 ruled *"**No chooser until S4.7** (re-confirms the S1.3 ruling): **+** routes straight to Trip Details; S4.7 supplies the second card and activates the chooser."* Founder ruling at the walk: **+ opens `create-trip-entry`, with both cards drawn and Fork greyed** (`comingSoon('fork')` + register-#2 analytics) until S4.7 implements it.

Why the reversal is cheap where the original ruling was cautious: the objection to a chooser was a one-option chooser — a screen that asks a question with a single answer. Greying the second card answers that: the traveler sees that forking exists and is coming, which is the same argument that put the cover drop-zone, the Chat tab and the network section on screen greyed rather than absent. S4.7 activates the card instead of building the screen.

Route: `+` → `/itineraries/create` → *Start from Scratch* → `/itineraries/new` (Trip Details, unchanged) → Continue → the day editor at Day 1.

### 2026-07-31 — the screen chrome is the page, not a nav bar (founder-ruled, at the device walk)

Every frame in the mock set puts its heading **inside `.body-pad`** — there is no header bar anywhere in the set. The build had been using the navigator's header, which produced a bordered bar above the content on every trip screen. All the trip-flow screens now set `headerShown: false` and render `ScreenHeader` as the first thing in the page.

**`ScreenHeader` owns the safe-area inset**, and that is load-bearing rather than incidental: dropping the navigator header also drops the inset it was providing, so a screen that renders anything before the header collides with the camera cutout. It happened immediately — the workspace's eyebrow sat above the header and landed under the status bar. The fix is the mock's own grouping: eyebrow and title are **one block** (`ScreenHeader`'s `eyebrow` prop), so nothing can render above the inset by accident.

Also corrected against the frames at the same pass: the settings **gear** replaces the "Details" text on the editor · the workspace eyebrow is `users` icon + "Private Workspace" in accent, not an all-caps overline · avatars **overlap** (`margin-left: -8`, 2px surface ring) instead of sitting in a gapped row · activity cost renders as a **sign** (`₱800`, grouped) rather than a code, and rejoins the editor card's meta line as `location • cost` — the gap the previous entry flagged · the time field is a **spinner picker**, 12-hour.

### 2026-07-31 — decision 9 is partially reversed: the day surfaces split back into two (founder-ruled, at the device walk)

Decision 9 ruled *"One day surface, two doors — the chips editor **is** the day screen … the `collaborative-edit` mock is this same screen's decorated state."* Built that way and walked on the device, the founder's read was that the consolidation is **where the confusion lives**: `trip-editor-days`, `collaborative-edit` and the workspace all appeared to do the same job. Ruling: **a workspace day card opens `collaborative-edit`, and `collaborative-edit` stays the screen the mock draws.** `trip-editor-days` is explicitly parked — *"I'll circle back to trip editor days once I get more clarity."*

Reading the two frames side by side supports the split; they are not one screen decorated two ways, they are two jobs:

| | `trip-editor-days` | `collaborative-edit` |
|---|---|---|
| header | trip title + settings gear | ← **Day 2: Ubud Market** |
| day chips | Day 1 / 2 / 3 / **+** | none |
| card | **grip** · time · name · **kebab** · `📍 Seminyak • ₱800` | time · name · `📍 Ubud Center` |
| status | none | `Being edited by @…` + the `Updated …` pill |
| action | **FAB** | View Activity History |

So: **the editor builds the plan** (add/remove days, add activities, reorder, delete) and **the detail reads one day** (who is editing what, tap a card to edit it). Routes are `/itineraries/{id}/days` and `/itineraries/{id}/days/{dayId}`.

**Consequences, stated rather than discovered later:**
- **Ticket 05 AC 8 is inverted.** It asked that *"One day surface remains in the tree … no orphaned screen survives."* There are now two, deliberately; `tabRouting.test.ts` asserts the split and each screen's job instead of the merge.
- **The detail screen has no add, no reorder, no day-title edit, no delete** — the mock draws none of them. Everything that builds the plan is reachable only from the editor, which today is reached only by the create flow's Continue (decision 13, unchanged). **That is the gap the parked `trip-editor-days` decision has to close**: as it stands, a returning traveler entering from the workspace can edit existing activities but cannot add one.
- **Cost comes back into scope at that decision too.** The editor's card meta is `📍 Seminyak • ₱800` — location *and* cost; the detail's is location only. The interim day surface had dropped cost entirely; it now belongs on the editor card, where the mock puts it.

### 2026-07-31 — the cross-mode duplicate check is one-directional by design (founder-ruled, during implementation)

Ticket 02 asked for *"One pending invitation per workspace+target … across both addressing modes"*, and the first implementation held it both ways. The founder challenged the handle→email half on the merits and it does not survive:

- **It made the handle path care about emails.** `inviteByHandle` resolved the invitee's account address (a `TravelerService.emailOf` added for that one line) purely to look for a pending email-invite. Identity handing an address to a module with no other reason to know it — the wrong coupling, and the wrong direction of dependency for two features whose whole distinction is that one addresses a **mailbox** and the other addresses a **traveler**.
- **It was approximate anyway.** A traveler has one account email; the owner may have invited a different address they also control. So the check caught the common case and silently missed others — a check whose failure mode isn't clean, which this repo has been burned by three times.

**Kept:** the email→id direction. `invite(email)` already calls `travelerIdsWithEmail` for the already-member check, so asking "does that traveler hold a pending id-invite" is free and **exact** — it asks who owns this precise address, not what address this person has.

**Moved, not dropped:** the guarantee the removed half was standing in for now lives where it belongs. `accept` refuses when the caller is already a member (`ALREADY_A_MEMBER`, 409). That is strictly stronger than an issuance-time cross-check because it holds however the duplicate arose — cross-mode, a race between concurrent invites, or an address that changed after the invite went out.

**The hole was real and this story opened it.** Before S4.9 a traveler had exactly one email, so two email-addressed invitations could never resolve to the same person, and `accept` could safely trust issuance. Adding a second addressing mode broke that assumption: `admitMember` persists straight into `membership`'s `PRIMARY KEY (workspace_id, traveler_id)`, so the second accept was a **500**, not a conflict. Verified by sabotage — `thatSameTravelerCanOnlyEverJoinOnce` fails with `expected:<409> but was:<500>` when the guard is removed.

Net effect on the ticket AC: two pending invitations to one traveler are now *possible* (one per door) and *harmless* — the inbox shows both, either one joins them, the other is refused cleanly and the owner can revoke it.
