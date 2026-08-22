# S4.28 — Travelers tab: member management + invite link

**Status:** ready-for-agent
**Grilled:** 2026-08-22 (grill-with-docs, four rounds + design-prompt cycle) — founder rulings recorded per question in this spec and in ADR-032.
**Design baseline:** the founder's Claude Design canvas **Travelers Spec s2** (frames 0–8 + component contract C1–C7 + motion contract M1–M7, all normative; the dashed **v2 annex is explicitly not built**). Archived copy: `mock/` beside this spec. Per the standing rule, the mock's own markup answers layout/icon/copy questions.
**ADR:** ADR-032 (invite link + join request model; membership-policy changes).
**Candidate-capability note:** `invitation.send` (already on ADR-009's list) and **join-link issuance** (`invitation.link` — a capability, footprint-growing, not governance) → register #14's accumulating map.

## Problem Statement

Inviting a co-traveler today lives in the wrong place and covers too few people. The only door is the "Invite Traveler" header action inside the Itinerary Workspace *editor* — a membership act buried in a plan-editing surface — and it only works for people the inviter can name by email or exact @handle, which requires the invitee to already be on Largata. There is no way to bring in someone who isn't on the app short of dictating an email address, the accept experience is a bare text card, and the Travelers tab — the natural home of "who is on this trip" — is a read-only roster. Ownership transfer, remove and leave are stranded on a soft-retired members screen nobody can find.

## Solution

The Travelers tab becomes the trip's member-management surface, and a shareable **invite link** becomes the door for people not on the app:

- The tab shows the roster in sections (**Travelers · Invited · Requests**) with a pinned **Add traveler** CTA. Any member invites by @handle or shares the trip's invite link; the owner alone removes members and answers link-join requests.
- The **invite link** works like a Discord invite with a consent gate: anyone with the link opens a postcard-style landing, signs up if needed (full, unmodified onboarding), and **requests to join**; the owner approves (membership immediately — the request was their consent) or declines silently. One live link per trip, no expiry, no regeneration.
- The handle-invitation accept experience on the Trips tab becomes a context-rich card (cover, destination, dates, who's going, expiry) with an asymmetric Accept / Decline.
- Ownership transfer rehomes into the tab (owner: row ⋯ menu; offeree: an inline Accept/Decline card at the top of the tab). The members screen and the old invite screen are deleted.
- **Membership freezes at publish**: no inviting, removing, requesting, approving, or ownership transfer on a published trip; leave stays.

## User Stories

1. As a trip member, I want a Travelers tab that lists everyone on the trip in sections (Travelers, Invited, Requests), so that I can see the state of the whole roster at a glance.
2. As a trip member, I want an always-reachable "Add traveler" button pinned at the bottom of the tab, so that growing the group never requires scrolling or hunting through an editor.
3. As a trip member, I want to invite any traveler by their exact @handle from the add sheet, so that I can bring in friends without waiting on the owner.
4. As a trip member, I want the add sheet to tell me when a handle matches nobody and pivot me to the invite link, so that a friend not yet on Largata still gets invited in the same motion.
5. As a trip member, I want to share the trip's invite link through my platform's share sheet, so that I can invite people over WhatsApp/Messenger without typing anything into Largata.
6. As a trip member, I want the same live link every time I share, so that earlier shares never go stale.
7. As a trip member, I want to see pending invitations in an Invited section (with who invited them) and revoke any of them, so that the group can manage its own outstanding asks.
8. As a link recipient without a Largata account, I want the link to open a postcard showing the trip's cover, title, destination, dates and traveler count, so that I know what I'm joining before I'm asked to sign up.
9. As a link recipient without an account, I want one CTA that takes me through the standard sign-up and onboarding and then **returns me to the invite landing**, so that I never have to dig the link out of my chat again.
10. As a signed-in link recipient, I want a "Request to join" CTA on the landing, so that I can ask to join without knowing anyone's handle.
11. As a link recipient, I want the landing to show "Request sent" after I request (and whenever I re-open the link while pending), so that I know the ball is with the owner.
12. As a link recipient whose request was approved, I want the trip to simply appear in my Trips (and the landing to offer "Open trip workspace"), so that joining completes without a second handshake.
13. As a link recipient whose request was declined, I want no notification and the ability to request again, so that a decline stays socially weightless.
14. As a link recipient who is already a member, I want the landing to recognize me and open the workspace, so that a stale link never dead-ends.
15. As a link recipient holding a link to an archived or published trip (or a broken token), I want an honest "This trip isn't taking new travelers" state, so that I don't chase a closed door.
16. As the trip owner, I want link-join requests in a Requests section only I can see, with Approve/Decline per row, so that strangers pass through my consent before entering the workspace.
17. As the trip owner, I want Approve to create the membership immediately, so that the person who already asked doesn't wait on a third handshake.
18. As the trip owner, I want to remove any member behind a confirm that says their content stays, so that I can manage the group without destroying its record.
19. As a non-owner member, I want to leave the trip from my own row behind a confirm, so that exiting is self-service.
20. As the trip owner, I want to offer ownership from a member's ⋯ menu, revoke a standing offer from the same menu, and see "Ownership offered · waiting on them" on their row, so that transfer lives where the people are.
21. As a member offered ownership, I want an Accept/Decline card at the top of my Travelers tab, so that I can take or refuse the role without hunting for a hidden screen.
22. As an invitee, I want my invitation on the Trips tab as a card with the trip's cover, destination, dates, who's going, who invited me, and when it expires, so that I have context before committing.
23. As an invitee, I want Accept to show progress in the button and land me in the workspace, so that joining feels immediate.
24. As an invitee, I want Decline behind a confirm that tells me the inviter won't be notified and can invite me again, so that declining is safe.
25. As an invitee with an unverified email, I want Accept to route me to verification first, so that the verified-mailbox gate holds.
26. As a traveler, I want expired invitations to render nowhere (inbox or Invited section), so that dead asks don't clutter either side.
27. As a trip member, I want every avatar to show the traveler's photo with tinted initials only as fallback, and tapping an avatar to open their profile dialog, so that the roster stays recognizably human.
28. As a trip member on a published trip, I want the tab read-only for membership (no add bar, no Invited/Requests, no remove/transfer) while Leave still works, so that a published record's group is stable but nobody is trapped.
29. As a traveler, I want nobody's email address rendered anywhere on the roster (email-legacy invitations show a neutral "Email invitation" row), so that addresses stay private.
30. As a traveler using the app, I want the tab, sheets, menus, cards and landing to follow the motion contract (and jump-cut under Reduce Motion), so that the surface feels finished rather than assembled.
31. As a founder, I want analytics on link shares, teaser views, requests and their outcomes, so that the parked guest-accounts trigger ("conversion dying at the sign-up wall") is measurable rather than a hunch.

## Implementation Decisions

**Authorization policy (three changes, all founder-ruled on the record — ADR-032; /v1 semantics changes ride its waiver):**

1. **Any member** may invite by handle, revoke a pending invitation, and read/share the invite link. Issuance stops requiring owner-ness (the additive widening S1.2's grilling explicitly anticipated). **Owner-only:** removing members, the Requests queue and its approve/decline, offering/revoking ownership transfer.
2. **Owner-only removal is reaffirmed** (the s1 mock's any-member-removal was challenged and rejected: an approve-then-purge griefing surface). Self-leave stays self-only; the owner can neither leave nor be removed (transfer first).
3. **Publish freezes membership**: invitation issuance/revocation, member removal, join-request creation/approval, invitation acceptance, and all ownership-offer operations (offer, revoke, accept, decline) are refused on a published trip. Pending invitations and offers become inert and hidden (they resurface if the trip unpublishes; invitations still expire naturally). **Leave stays allowed.** Completed-but-unpublished trips keep everything open (post-trip adds are a real use case: bring in the friend who was there). Archive keeps its existing posture.

**Domain (new concepts — glossary + entity table updated in the domain model):**

4. **Join Link** — the trip's single shareable invite token: one per workspace, opaque and unguessable (≥128-bit URL-safe random), minted lazily on first member fetch, reused forever. No expiry, no regeneration (reset parked with trigger). It is dead — computed at read time, not stored — while the trip is archived or published.
5. **Join Request** — a traveler asking the trip: workspace + traveler + status `pending → approved | declined | superseded`. At most one pending per workspace+traveler; decline is terminal for that row but the traveler may request again (new row). **Membership arriving by any path supersedes the other path**: accepting a handle invitation resolves an open request, and approving a request voids pending invitations for that traveler on that trip.
6. The two consent directions are the model's spine: an **Invitation** is the trip asking the traveler (traveler consents by accepting); a **Join Request** is the traveler asking the trip (owner consents by approving — approval creates the membership immediately, with no second handshake).
7. Creating a join request requires a **verified email**, the same gate invitation-accept holds. Since requesting requires a signed-in, onboarded account, approval never admits a half-built identity — onboarding always happened before the request existed.

**Wire (all additive within /v1):**

8. New endpoints: fetch-or-mint the trip's join link (member-scoped; returns the full share URL) · the **join teaser** read by token (answers anonymously with title, destination, dates, traveler count, cover reference, and — when a bearer token is present — the viewer's state: can-request / pending / member / dead) · create join request (by token, authenticated + verified) · list join requests (owner) · approve / decline a request (owner).
9. **The teaser is the app's first anonymous product endpoint** — deliberate, token-gated, returning teaser fields only (never roster names, never plan content). Recorded in ADR-032 as the exception to the everything-authenticated posture.
10. **Two capability-scoped cover reads exist because the audience fence correctly refuses both audiences**: the join teaser's viewer (anonymous or non-member) and an invitation's invitee cannot pass the itinerary-cover audience check. The join token and the invitation are themselves the authorization: a token-scoped cover route under the join surface, and an invitation-scoped cover route for the inbox card. Both serve the thumbnail variant only.
11. The inbox invitation payload gains additive fields: destination, date range, cover reference, inviter handle, and a going-preview (first few member summaries + total count). The pending-invitations payload gains the inviter's handle; email-born rows are recognizable (no handle/invitee id) and the client renders them addressless.
12. The share URL is composed server-side from per-environment configuration (`<web-base>/join/<token>`), so links open the web app today and the same URLs can become Android App Links later without reprinting anything.

**Mobile:**

13. The Travelers tab is rebuilt to the canvas: sections with live counts (owner first, then join date), pinned add bar, avatar-only row tap opening the existing read-only profile dialog (≥44px hit), ⋯ on rows per the permission matrix.
14. The **add sheet (v1)** is exact-handle lookup only: search field → found-traveler card with a direct Invite action (ghost "Invited" pill when pending, "On this trip" when a member) → share-link row → the no-results pivot. No Suggested section, no multi-select, no batch CTA (all deferred with the suggestions story; the canvas's v2 annex is their design, untouched).
15. **⋯ menus are app-drawn compact bottom sheets** (Android has no platform action sheet), sharing the add sheet's present/dismiss. Variants: owner-on-member [Transfer ownership · Remove from trip] · owner-on-offered-member [Revoke ownership offer · Remove from trip] · own-row [Leave trip]. Every confirm behind them stays a platform alert with the canvas's exact copy.
16. **Ownership transfer rehomes**: the trip-screen offer banner is deleted along with the members screen and its route; the offeree acts on the frame-8 card pinned at the top of their Travelers tab; the owner acts through the ⋯ menu and reads the "Ownership offered · waiting on them" row sub. The offer/accept backend semantics (one pending per workspace, INV-4 swap at accept) are untouched.
17. The **/join landing** is a new route reachable only by the link — in no tab or nav graph. It renders the postcard (one card, one entering unit) with the five states as drawn. It is the app's only pre-auth screen: the auth gate admits the join segment unauthenticated.
18. A **persisted pending-join store** carries the token through sign-up/onboarding and app restarts (module-scoped store + storage — state that must survive navigation and process death never lives in a screen's component state): opening `/join/<token>` signed-out stashes the token; when the gate settles into the app it routes to the landing instead of Home, then clears.
19. The **per-member avatar tint map** (the canvas's eight well/ink pairs) is minted as a shared module, assigned deterministically by traveler id, and used only to paint initials fallbacks — photos are always primary. Chat (S4.10) inherits it instead of duplicating it.
20. The old invite screen, the editor header's "Invite Traveler" action, and the email-invite UI are deleted. The email endpoint stays on the wire, dormant (ADR-008).
21. The inbox card is rebuilt to frame 6: cover, title, destination · dates, facepile + "going" line, "Invited by @handle · Nd ago", expiry (destructive tint under 48h; expired never render), Accept pill with in-pill spinner, Decline behind its confirm. Existing behaviors are kept: accept navigates to the workspace; unverified email reroutes to verification.
22. **Motion contract M1–M7 is normative** (entrances, exits+layout close, approve = exit+entrance, sheet timing, press feedback, once-per-visit cascade, postcard-as-one-unit), including Reduce Motion (entrances jump-cut, opacity fades stay) and "nothing else animates". One platform-forced deviation, recorded: RN's new architecture deprecates `LayoutAnimation`, so the 200ms layout-close is implemented with reanimated layout transitions at the same curve/duration; the web fallback stays a 200ms CSS height transition as written.
23. Analytics: server-side events for teaser views, request creation and approve/decline; client-side track events for link shares. Together with the existing invite events they make the parked guest-accounts trigger measurable.
24. Live updates are **not** in scope (parked): the tab is pull-based — refetch on focus and after mutations, which is also what the motion keys off. What already works stays: WS-1's membership eviction closes a removed member's socket subscriptions.

## Testing Decisions

Good tests here assert **external behavior at the highest existing seam** — the HTTP surface for the backend, pure modules and the Playwright suite for the client — never internals. Every authorization/fence test must have a **distinguishable failure**: assert the discriminating error code, not just the status (two 404s with different codes are different worlds — the repo's standing indistinguishable-outcomes rule).

- **Backend integration tests** (the existing `*IT` + singleton-container pattern) at the HTTP seam: the policy matrix (member can invite/revoke, member cannot remove or approve, owner-only paths refuse members by the named code) · the publish-freeze matrix (each membership/offer operation refused on a published trip, allowed on completed-unpublished; invitation accept refused; leave allowed) · join-link lifecycle (lazy mint, stable reuse, member-scoped read) · join-request lifecycle (verified-email gate; approve creates membership and supersedes pending invitations; decline allows re-request; one pending per traveler) · the anonymous teaser (valid token → teaser fields and nothing else — assert roster/plan absence; invalid token → not-found; archived/published → dead state) · both capability-scoped cover routes (authorized by token/invitation, refused otherwise) · additive inbox/pending fields.
- **Coverage tests**: the join controller is deliberately reachable without the guard — its exemption must be **qualified by controller + reason**, not a bare handler name (the epic-map line about the exemption set's bare-name blind spot applies; do not widen it).
- **No data migration** — the story's schema is two additive tables, so no migration-stepping IT is owed.
- **Mobile Jest** at pure-module seams (the codebase's established pattern): section assembly from roster+invited+requests · menu-variant selection · tint-map determinism · the pending-join store (stash, settle-route, clear; survives a simulated restart) · gate destinations including the unauthenticated join segment · expiry labels and the 48-hour switch · the add-sheet state machine (query → found/pending/member/no-results) · the once-per-visit cascade guard.
- **Playwright specs** (the H1 suite, both projects): the tab walk (invite → Invited → revoke), owner approve/decline with an API-seeded request, the five landing states (the web rung is exactly where /join lives today), the ownership-offer flow end to end across two pool travelers, and the inbox card accept/decline. Prior art: the existing e2e specs driving the verified pool (`t1`–`t5`) — reach for the pool for every 2+-traveler scenario, and state which tag played which role.
- **Device rung** (the gate, per H2's tiers): the motion contract and the real share sheet are closable only on a device; the link-open path (chat app → browser → web landing) is walked by hand once.

## Out of Scope

- **Suggestions ("people you had trips with"), multi-select and the batch CTA** — deferred until public profiles exist; the canvas's v2 annex is their design (epic-map line + trigger).
- **Guest accounts** — parked (epic-map line; trigger: invite-link conversion visibly dying at the sign-up wall, measured by this story's analytics). Link joiners go through the full, unmodified onboarding — **no trimmed path (rejected, not parked)**.
- **Link expiry / regeneration / reset** — parked (trigger: first real link-request spam report).
- **Live roster/queue updates over the socket** — parked (trigger: S4.10 mints the subscription client patterns).
- **Notifications** of approval/decline/removal — the notifications backlog line, unchanged.
- Moderation/blocking, member caps, roles beyond owner, "added you" system messages, tab badges, profile stats on rows — the canvas's ruled-out list, binding.
- Email-invite UI (endpoint dormant on the wire) · Chat (S4.10) · Android App Links registration (the URL shape is ready for it).

## Further Notes

- **One canvas caption is corrected by this spec**: frame 7's "Approval never returns the traveler here — they get a notification" — no notification system exists (parked backlog line). Approval's discovery is the trip appearing in Trips, plus the landing's member state if the link is re-opened. The rest of C7 stands.
- **One canvas line is flagged for the owner review rather than silently adopted**: the archived-trip tab drawn with "no ⋯ at all, no Leave" contradicts S1.9's ruling (and the shipped server semantics) that **self-leave survives archive** — and this tab is now the only leave door in the app. Recommendation: keep ⋯ → Leave on the viewer's own row on archived trips; the server already allows it. Owner decides at review; the build follows the ruling.
- The archived mock set under `mock/` is the design baseline; the conversation-attached copy suffered encoding mangling in transit, so the founder drops the original `Travelers Spec.dc.html` + `support.js` beside the archived README (the Claude Design canvas remains authoritative meanwhile).
- The Invitation entity's S1.2 issuance rule ("owner only; widening to members would be additive") is superseded exactly as it predicted — recorded in the domain model and ADR-032.

## Comments

### 2026-08-22 — confirms are app-drawn, not platform alerts *(founder decision, walking the built tab)*

Decision 15 says "every confirm behind them stays a platform alert with the canvas's exact copy," and the canvas says it four times (frame 4's title, C4, M4, frame 3b's caption). That instruction is right for the platform it was drawn against: on Android `Alert.alert` renders frames 4 and 5 almost exactly. **It has no good meaning on web.** The only platform alert a browser owns is `window.confirm` — a grey strip pinned to the top of the window, title and body collapsed into one blob of text, OK/Cancel — which is what the founder saw and correctly rejected. Following the canvas literally therefore produced the drawn dialog on one platform and a browser warning on the other.

`ConfirmStation` now draws frames 4/5 as a real `Modal` — 17/700 title, 13.5 body, radius 14, hairline-split Cancel · action, destructive `#B91C1C` except the accent-toned Offer — mounted at the root beside `CropStation` and driven through the unchanged `confirmWith` API, so none of its eight call sites moved.

**Two bugs die with it, and they are the argument for redrawing rather than restyling.** `window.confirm` is gesture-bound, so deferring it — needed on Android, where an Alert raised from inside a visible `Modal` renders *behind* the ⋯ sheet — made Chrome suppress it silently. Native and web wanted opposite timings, and `afterSheetDismissed` had to be forked to serve both. An app-drawn dialog is neither gesture-bound nor Modal-trapped, so that fork is deleted rather than maintained.

The harness moved with it: the Playwright fixture watches the dialog's `CONFIRM_DIALOG_TESTID` and auto-accepts, preserving the `signal.dialogs` contract that 20+ assertions across the suite already depend on. Native keeps no `Alert.alert` for confirms; `notify` still uses it for one-way messages.

### 2026-08-22 — the /join landing gains an exit *(founder walk)*

Decision 17 and C7 already specified it — *"everything else exits to the Trips tab (signed-in) or closes (web)"* — and nothing rendered it, so a traveler who asked to join was stranded on the pending card with only the browser's back button. A quiet "Back to my trips" now sits below the card (not inside it, so the postcard still speaks once), rendered only when signed in and not already a member. Deliberately **not** a trip preview: the postcard never shows roster names or plan content, and opening one would hand plan content to someone the owner has not approved.

### 2026-08-22 — a pending join request gets a Trips card, and it can be withdrawn *(founder decision)*

**This adds ticket 11 and extends the story's scope.** The spec shipped C2's two consent directions asymmetrically: a handle invitation surfaces as a frame-6 card on Trips, while a join request surfaced nowhere at all — the canvas covered that gap with *"they get a notification"*, and no notification system exists (see the canvas-correction note above). The founder walked it and found the hole: you ask to join, and the app tells you nothing.

**The frame-6 card is reused** — same cover, title, destination · dates, and going-facepile — with only the action row differing: a greyed **"Requested"** ghost pill (the add sheet's existing "Invited" ghost vocabulary: 13/600 `#A59E99` on a hairline border, not tappable) beside a **"Withdraw"** quiet text action.

**Why withdraw exists at all, and why that word.** An invitation expires after 14 days, so its card self-cleans; **a join request has no expiry**, so a request the owner simply never answers would otherwise sit on the traveler's Trips page forever with no way to clear it. The word mirrors the consent direction C2 is built on: *Decline* refuses someone else's ask, *Withdraw* retracts your own. "Cancel" is avoided because it collides with the confirm dialog's own Cancel button.

**Withdraw is confirmed, and the wording carries real information**: re-requesting needs the invite link, which the traveler may no longer have, so the act is less reversible than C2's "they may request again" implies — *"Withdraw your request? / You'll need the invite link again to ask a second time."*

**The tradeoff, taken knowingly:** the card renders only while the request is `PENDING`, so on decline it exits and the requester can infer they were refused — a partial erosion of C2's *"declines (silent)"*. Accepted because "silent" there means no notification and no confrontation, a card quietly vanishing is the gentlest available signal, and the alternative — a card lingering on a dead request — actively lies.

### 2026-08-22 — the add sheet's lookup is explicitly triggered, not rolling *(founder decision)*

Decision 14 calls the add sheet "exact-handle lookup only", and the built version fired a query on **every keystroke**: typing `pool_t3` cost **seven** requests, six of which asked whether a traveler exists whose handle is `p`, `po`, `poo`… Not partial matches — wrong questions. The founder's reasoning, which is better than the cost argument: rolling results belong to the deferred suggestions story ("people you had a trip with, or within your network"), and showing them now trains the traveler to expect prefix matching this feature does not do.

The lookup now waits to be asked. The search field's magnifier becomes the trigger, the keyboard's return/enter key does the same, and typing sends nothing. Seven requests became **one**, measured on the preview.

**This deviates from frame 2, knowingly.** The canvas draws the magnifier as decoration on the field's left with a text cursor after the handle, and no submit control anywhere. It is now a tappable control that colours accent when the query is long enough. The deviation is the founder's call and is recorded here rather than left to read as an accident.

**The gate is TWO characters, deliberately below the three the server enforces** *(founder, same session)*. `Handle.MIN_LENGTH` is 3 and `[a-z0-9_]{3,20}` refuses anything shorter — but **two-character handles exist and are grandfathered**: the founders minted them while the gate was looser and it was tightened afterwards, so those handles can never be recreated and cannot be validated against the current rule. Gating the search at the mint minimum would make exactly those travelers **permanently unfindable by handle**. `HANDLE_SEARCH_MIN_LENGTH` is therefore its own constant rather than a reuse of the mint rule, the two are asserted to differ, and the reason lives in that test because no code comment may carry it.

*(Cost was never the real argument: the lookup is an exact match against `traveler_handle_idx`, a unique index on `lower(handle)`, so each query was an index probe returning at most one row. The waste was in meaning, not in load.)*

### 2026-08-22 — the link row keeps one label in every state *(founder decision)*

Frame 2b promotes the invite link into the accent well on a no-results search **and renames it** — the canvas draws "Send them the invite link" there against "Share invite link" in the default footer. Carried into the copy-only wording (the note above), that became "Copy the invite link for them" versus "Copy invite link", so the control renamed itself under the traveler depending on whether their last search happened to match.

It is now **"Copy invite link" in every state** — idle, found, and no-match. `SHARE_LINK_PIVOT_LABEL` is deleted rather than left unused, so it cannot drift back. The promotion into the accent well **stays**: frame 2b's pivot is about drawing the eye to the link when a handle dead-ends, and that still works with a stable name — it is the renaming that was the defect, not the emphasis.

### 2026-08-22 — Add traveler pins to the bottom, and the lifecycle CTA leaves every tab but Day-by-Day *(founder decision)*

C5 calls Add traveler "the pinned bottom bar's single accent CTA" and frame 1 draws it docked above the home indicator. It shipped **inside the scrolling content** instead, so on a long roster it scrolled away and on a short one it floated mid-screen. Worse, the workspace's lifecycle rail — **Start Trip / Complete Trip / Publish Itinerary** — rendered on *every* tab, so the Travelers tab docked two stacked bars and Add traveler was not even the lower of them.

The lifecycle CTA now renders **only on Day-by-Day**, where the plan the act is about lives; Travelers, Polls, Photo Dump and Chat carry none. Travelers joins Chat in the docked treatment that already existed for the composer: the roster scrolls inside its own bounded height and the bar is pinned beneath it.

`workspaceChrome.ts` holds both rules as named predicates rather than tab-name comparisons scattered through the screen, and its test walks **every** tab in `WORKSPACE_TABS` — so a tab added later cannot quietly inherit the rail, and no tab can ever both dock a bar and carry one, which is the defect this fixes.

*(S4.10's chat guard asserted the docking by pinning the screen's literal source text, `scrollEnabled={active !== 'chat'}`. It now asserts the same property through the predicate. The guard was right; only its spelling was stale.)*

### 2026-08-22 — Add traveler becomes a section-header action, not a docked CTA *(founder decision, superseding the entry above)*

Pinning the bar (previous entry) put the affordance where C5 asks for it and immediately raised the better question: the **Polls** tab already had an idiom for *create a thing* — a quiet accent text action on the section-header line — and the workspace was now carrying two idioms for the same job.

Add traveler moves onto the `TRAVELERS · N` header line as `+ Add traveler`, matching Polls' populated-state treatment. The docked bar is deleted, and Travelers leaves the docked tab set, so it scrolls as one page again like every tab but Chat.

**This drops C5's "pinned bottom bar" and frame 1's docked CTA, knowingly.** The argument against was reachability — a header action scrolls off a long roster while a docked bar stays under the thumb — and the founder took the consistency instead. Recorded so the deviation is legible next to the two smaller ones already noted here.

*(`addBarVisible` is renamed `canAddTravelers`: the rule it encodes — open trips only, never published or archived — is unchanged, but the old name described furniture that no longer exists.)*

### 2026-08-22 — the link row holds its place; only its emphasis changes *(founder decision)*

Frame 2b hides the footer link row on a no-results search and draws a promoted one directly beneath the empty message, so the control **relocated** between states. With the renaming already removed (note above), that movement was the only thing left changing — and a control that jumps while keeping its name reads as flicker rather than as emphasis.

There is now **one** row, rendered in one position below the divider, whose treatment switches to frame 2b's accent well (`#FFF7ED` on `#FED7AA`) when a search dead-ends. Measured on the preview, it shifts 7px vertically between states rather than moving to a different part of the sheet — the residue is the promoted padding and frame 2b's bare accent icon standing in for the plain row's 40px link disc, both of which the canvas draws.

**The pivot's intent survives**: C7's *"search dead ends pivot instead of stalling"* is about the link becoming the visible answer when a handle fails, and the accent well still does that. `linkRowVisible` is deleted — with the row always present, the predicate had nothing left to decide.
