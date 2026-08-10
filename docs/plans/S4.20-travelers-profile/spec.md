# S4.20 — Travelers → profile: the stub, the owner-only tag, the members soft-retirement

**Status:** ready-for-agent *(owner review passed 2026-08-09 — "all good")* · **Epic:** E4 · **Depends on:** S4.17 (shipped — the Travelers tab this story re-points), S4.14 (shipped — the vanity number the card carries), S4.0/ADR-015 (shipped — handles), S3.3 (shipped — the authenticated avatar path), S1.5/S1.6 (shipped — the member flows going dormant)

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** S4.17 decision 9 (travelers row-tap → the member flows — superseded here; Comment appended there) and its ticket-06 ruling (*"the `/members/[itineraryId]` route stays"* — narrowed here to one door, not reversed) · S4.14 + the epic map's public-profile park (the number's *public* projection stays parked; its member-scoped exposure ships here — the park's line gains the scope note) · ADR-008 (one additive wire change, named below) · Artifact 03 / the authorization guard (the roster is the member-gated read this story rides — no new authority rule) · ADR-015 (handles) · S1.2 (the display-name fallback ruling this story leaves alone) · the S1.3 dead-click rule (no affordance without behavior).

## The pull, on the record

Same session as S4.19 (2026-08-09, five rounds): the founder's fourth ask — *"clicking the traveler will go to their profile not on the member list. I think we can retire that screen now"* — plus the email-hiding rider from round 2. The sweep reshaped the retirement: invite was never on the members screen (it has its own screen off the editor header), but the **ownership-offer banner deep-links to `/members`**, so a full retirement would strand pending offers. The founder took the soft-retirement (q18, q24), consented on the record to the member-management gap (q6, q12), and chose the full card minus email for the stub over the recommendation to hold the vanity number back (q19, q25 — flagged twice, held twice).

## Goal

The Travelers tab tags the owner and nobody else; tapping any traveler — yourself included — opens a read-only profile stub built from the own-profile card, email hidden everywhere that card renders; the members screen keeps resolving but loses its main door; and member management goes dormant until the profiles story re-homes it.

## Locked decisions *(founder, 2026-08-09, in grilling order)*

### 1 · The Travelers tab tags the owner and nobody else

Row anatomy stays (avatar · name · chevron), but the role line renders **only on the owner's row** ("Owner"); member rows carry no role text — today every row says Owner/Traveler. *"On the travelers tab, only owners will have the tag of owner."*

### 2 · Tapping a traveler opens a read-only profile stub — the profile card, shared, email gone

The own-profile card extracts into a shared read-only component showing **avatar (authenticated media path — never a bare image URL) · display name · @handle · bio · vanity number**, each hidden when null. **Email renders nowhere the card renders** — the dedicated email line is deleted from the card itself, so the own-profile page loses it too (the founder's rider, confirmed q11). No role badge on the stub (q10 — the tab's owner tag is the one role fact that survives). Tapping your own row opens the same stub; the editable profile keeps its home on the profile tab. The display-name fallback ruling stands untouched: an account that never completed onboarding renders its email-derived fallback — every real account passes the onboarding profile gate (handle hard-required at submit), so the leak is the deliberately-legible test pool and nothing else. Accepted on the record (q11: *"you are required to enter your name and handle, so why is this a problem?"* — correct, and conceded).

### 3 · The stub's data is one additive wire change — the roster fattens

**Correction to the grilling's framing, found at spec time and carried honestly:** the split decision (q27) was argued partly on "B stays a pure-client story," and that premise is false — the member roster response carries travelerId, displayName, avatarUrl, role, joinedAt, ownershipOffered and **none of handle, bio, or vanity number**. The stub's fields ride **additive nullable fields on the existing roster response** (`handle`, `bio`, `vanityNumber`) rather than a new traveler endpoint: the roster is already member-gated through the guard, so the profile read inherits exactly the audience the stub serves — co-travelers — and no new authority rule is invented (the highest existing seam, Artifact 03's shape). ADR-008: additive, no waiver. This also **widens S4.14's scope statement** — the vanity number shipped *"additive on `/v1/me` only"*; after this story it also rides the roster, member-scoped. The epic map's public-profile park gains the note: what stays parked there is only the *public* projection.

### 4 · The members screen soft-retires — the route lives, its main door closes

The Travelers tab stops linking to `/members/[itineraryId]`; the **ownership-offer banner's deep link stays** — a pending offer must remain actionable — and after this story it is the screen's only remaining door. Consequence, consented on the record (q6, q12, q24): **remove member, leave trip, and the four ownership-transfer acts go dormant** — reachable only while an offer is pending puts a banner on someone's workspace. Nothing is deleted: S4.17's ticket-06 ruling (*"the route stays, deep links must not dead-end"*) is narrowed to one door, not reversed; `largata://members/<id>` still resolves. The epic-map backlog line records the re-home: member-level acts land on the profile surface when the profiles story builds it, and that story demolishes the members screen properly.

### 5 · The vanity number makes its member-scoped debut here — the public-profile story keeps only the public projection

Flagged twice as front-running the parked public-profile story; the founder held: the stub shows the full card minus email, number included (q19, q25). Recorded consequence: the number's first exposure to people other than its holder is trip-scoped (co-travelers), decided here; the parked story's remaining scope is the *public* audience.

## Deviations from the mock *(stated per the mock rule)*

The S4.17 set draws neither a profile stub, an owner-only tag rule, nor any travelers-tab tap target change — decision 9 there sent row taps to the member flows. All three changes are founder amendments to that baseline, made on the record at this grilling. The stub screen itself has no mock at all: its layout is the own-profile card, founder-directed reuse (*"still the profile card with the avatar, name, handle, bio, vanity number"*).

## Wire changes

**One, additive:** the member roster response gains `handle`, `bio`, `vanityNumber` (nullable, projected from the traveler the membership names). Nothing renamed, retyped, removed, or re-semanticized. Existing clients are unaffected. *(Scope note carried to the epic map: this widens S4.14's "additive on `/v1/me` only" statement to the member-gated roster.)*

## Candidate-capability note *(ADR-009)*

None passes the potentially-gated test — viewing a co-traveler's profile card is existing data at an existing audience (the roster already names these travelers to each other); footprint unchanged, nothing meterable, not governance.

## Acceptance criteria

1. The Travelers tab shows "Owner" on the owner's row only; member rows carry no role text; anatomy otherwise unchanged.
2. Tapping any traveler row — including your own — opens the read-only stub: avatar, display name, @handle, bio, vanity number, each absent when null; **no email, no role badge, no edit affordance** anywhere on it.
3. The own-profile page renders the same card component and no longer shows the email line; Edit profile still works and still edits handle, display name, bio.
4. The members screen is unreachable from the Travelers tab; `largata://members/<id>` still resolves; with a pending ownership offer, the banner's link lands there and offer/withdraw/accept/decline all still work (two pool travelers).
5. The roster response carries the three new fields for every member; a non-member's roster request still refuses exactly as today (the guard masking rule — nothing about this story leaks profile fields past membership).
6. Dev-verified on the three rungs; pool identities stated per the standing rule (t1 = owner, t2 = member for the two-account checks).

## Testing decisions *(the seams — highest existing ones, no new seams; confirm at owner review)*

- **Controller IT seam** for the roster's new fields: the existing members-list IT family (S1.2/S1.5/S1.6 suites) is the prior art — assert the additive fields round-trip for a member, and re-assert the non-member refusal on the same endpoint. External behavior only: wire fields and named refusal codes.
- **Unit seam** for the owner-only tag rule in the `memberControls` pure-logic family (its table-driven test is the repo's best precedent).
- **Unit seam** for the card's field-visibility rule (null-hiding; email structurally absent) as a pure props-mapping module, prior art the `completionSummary` ban-list style — the test pins that no email string can reach the card.
- **The stub screen and the soft-retirement are proven on the walk**, not by a component harness — emulator plus the web-preview driver, with the offer-banner path exercised by a live offer between two pool travelers ("renders on web" is not "works on web").
- **The story gate is the highest seam**: the three-rung walk — tab tags, a member's stub, the self-stub, the own-profile page without its email line, the deep link resolving, and the offer flow end-to-end.

## Out of scope

Re-homing member management (parks to the profiles story, which also demolishes the members screen) · public profiles or any non-member audience for the card · profile editing changes · the friend graph · masking the display-name fallback (founder-ruled legible for the pool) · S4.19's surfaces.

## Comments

*(append-only)*

**2026-08-10 — implementation note: the avatar initials lost their email fallback, and that is a real behaviour change beyond deleting the email line.** Raised at this story's code review, recorded rather than decided. The old own-profile card called `initialsFor(displayName, email)`, so an account with a blank display name showed initials derived from its email local-part; the shared card calls `initialsFor(displayName, null)` and such an account now shows `?`. This follows from decision 2 taken literally — *"Email renders nowhere the card renders"* — and the alternative loses the ban its structural form buys: an `email` on the card's props is an `email` a future edit can render. **Nobody real is affected today**: the handle is hard-required at onboarding submit and display name with it, so only an account that never completed onboarding can reach the `?`, which is the deliberately-legible pool and nothing else — the same population decision 2's own fallback paragraph is about. Flagged for the founder because the spec's fallback sentence points the other way; if the `?` is unacceptable, the fix is a non-email initials source, not restoring the address.

**2026-08-10 — addendum, founder ruling on the running build: the stub becomes a bottom sheet, and decision 2's "screen" is reversed.** *"On the travelers tab, when we click the traveler, can it be a modal? Then a button at the bottom that says visit profile and will redirect to the actual profile? Profiles are not yet implemented, so we can gray it out for now."* What the decision was **about** is unchanged and still holds — the same shared card, the same five fields, email nowhere, no role badge, no edit affordance, self-tap included; only its **container** moves from a pushed screen to an in-place `Modal`. **The stub route is deleted, not kept** (founder choice, offered against keeping it as the greyed button's future target): a screen nothing reaches is the dead-end S1.3's rule warns about, and the route shipped hours earlier on this same branch, so no old client can depend on it. The sheet copies `FinalizeSheet` exactly — scrim, grabber, `workspaceRadii.sheet`, `sheetCtaHeight`, the accent/outlined CTA pair — so it is the theme's existing sheet, not a new one. **Visit Profile greys through `comingSoon('profile')`**, the same path Polls/Chat/Photo Dump take, so it fires the register-#2 analytics event and actually speaks on both platforms rather than being an inert rectangle. It is the parked public-profile story's first real caller, and gives that story a visible entry point to land into.

**One fix the sheet forced, worth keeping in mind for the next one:** RN's `Modal` renders **outside** the `MobileFrame` view tree on web, so it ignored the 393px frame and spanned the whole browser window. The sheet now caps itself at `MOBILE_FRAME_WIDTH` and centres. **`FinalizeSheet` has the same bug and is untouched here** — pre-existing, out of this addendum's scope, and now visible for whoever owns it next.

**2026-08-10 — harness, not product: the preview driver could not reach a tab and could not survive a confirm.** Both found while walking this story, both fixed on its branch, both now CLAUDE.md Gotchas lines. The click selector had no `role="tab"`, so the Travelers tab reported `NOT FOUND` while working perfectly on the device — the S1.3 dead-click shape with the opposite cause. And `window.confirm` was unstubbed while `window.alert` was stubbed: an unhandled confirm **blocks** headless Chrome rather than failing it, so accepting ownership hung the run with no output. AC 4 could not have been closed end to end on the web rung without both.
