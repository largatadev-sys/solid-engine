# S4.10 — In-trip chat

**Status:** specced — awaiting owner review *(flips to ready-for-agent at the owner's pass — the S4.19/S4.20 precedent)* · **Epic:** E4 · **Depends on:** WS-1 (this pull — the transport and connection layer), S4.17 (shipped — the workspace tab row whose greyed Chat tab goes live), S4.20 (shipped — the roster projection member identity reuses), S4.23 (shipped — the WriteFence the archive posture rides), H1 (shipped — the Playwright suite)

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** ADR-030 (the WS transport, envelope, catch-up convention) · 02-domain-model as amended this session (the In-trip Chat entry; the Chat Message entity) · Artifact 03 (the guard; every endpoint takes the resolved Membership) · ADR-002 (own module; workspace referenced by ID + service interface) · ADR-008 (all wire changes additive — no waiver) · ADR-017/S4.23 (the audience ladder + archive posture) · INV-1 (workspace wall — chat never crosses it) · P3 (message bodies are PII-adjacent: never logged) · the design baseline: the founder's Claude Design chat canvas (contracts C1–C6, M1–M5 — digest and normative transcription in `design/`).

## The pull, on the record

Chat entered launch scope 2026-07-31 on sight of the workspace mock's Chat tab, reversing the 2026-07-24 no-planning-conversation ruling on the record; the tab has shipped greyed since S4.9 (its row home moving to the six-tab row at S4.17, Details' death at S4.25 making it five). The owed UX flow + grilling ran **2026-08-20** (grill-with-docs, three rounds, 22 questions): the founder ruled the transport (**WebSockets, infrastructure first** — WS-1, ADR-030), the story **split twice** (WS-1 precedes; the activity-history surface splits out as **S4.27**, unscheduled), and one branch was **raised and withdrawn in the same round — photos in chat**: ruled in with dump integration, then taken back whole ("no photos in chat") when the reference-vs-copy and consent ripples were laid out. Recorded as dismissed, not parked; the deleted private Comment stays deleted; public Comment (S4.6) unaffected.

## Goal

Members of a trip talk in one place that sits next to the plan: a single text thread per trip on the workspace's Chat tab, delivered live over the WS-1 socket while the app is open, honest about what it is not (no photos, no receipts, no push — a closed app hears nothing).

## Locked decisions *(founder, 2026-08-20, in grilling order)*

### 1 · Text only, capped, append-only

One thread per trip. Messages are text, ≤ 2,000 characters, non-blank. **No edit, no delete, no threading, no mentions.** Deletion parks on the epic map with a trigger (first real regret/moderation report from a founder trip).

### 2 · Attribution is the traveler, and messages survive departure

`author_traveler_id`, **not** the membership — the deliberate divergence from polls (votes die with the membership; a conversation with holes where a departed member's words were is worse than one that keeps them). Chat is a record, like history. Departed authors render by handle at read time (traveler rows survive leaving); S5.5 anonymization sweeps chat with everything else.

### 3 · Chat is a planning surface: open while unpublished, publish turns it off

Writable in all three lifecycle states (`upcoming / ongoing / completed`) **while unpublished**. **Publishing closes chat**: writes answer a named refusal (`CHAT_CLOSED`), no events fire, and the UI needs no new door logic — the existing redirect to the published view already removes the tab. **Unpublish restores the workspace and chat reopens, history intact** — publish hides and freezes, never deletes (the S4.1 symmetric-unpublish posture). Reads stay member-gated and unclosed (the unpublish return path; no UI calls them while published). *(This re-cut Q9's "open while published" when the grilling's fact-check found the published redirect — server semantics and UI reachability now agree.)*

### 4 · Archive: read-only, S4.23's posture unchanged

The thread renders frozen for the owner (the ladder makes archived trips owner-only); the composer is replaced by the notice bar (canvas frame 5). Writes ride the existing WriteFence: honest 409 for the owner, masked not-found for a non-owner member. Undelivered client drafts are discarded on archive (canvas rule).

### 5 · Chat and activity history stay strangers

No `HistoryAct` for chat — history remains the plan's machine-written record; the message table is chat's own. No Editing Session, no lease, no `planVersion` bump (the S3.4 decision-5 / S2.1 workspace-act shape).

### 6 · Chat never crosses the publish wall

Workspace-grade data like the roster (INV-1): no projection, no feed, no fork copy, nothing on any published surface, ever.

### 7 · The v1 exclusion block, alpha-scoped

No unread badges or tab counts, no read receipts, no typing indicators, no reactions, no presence dots, no push. Parked as one epic-map block with a post-alpha trigger. **Consequence ratified with it:** sockets make chat instant between open apps; a closed app hears nothing until push is its own decision. The canvas's "↓ New messages" pill is **not** unread state — a client-side scroll affordance only, no server state, recorded as a deliberate canvas addition.

### 8 · Photos in chat: raised and withdrawn

Ruled in mid-grilling (upload-to-dump integration, previews), withdrawn whole in the next round on sight of the consequences (reference-vs-copy against the dump's real-delete semantics; the ADR-025 consent chain putting a chat photo on the public feed via a co-traveler's postcard). Dismissed on the record — not parked; re-raising starts from this paragraph.

## Mechanics *(the decisions' consequences)*

- **Own `chat` module** (the poll/invitation precedent): canon's workspace-aggregate framing holds while the implementation references the workspace by ID + resolved Membership (ADR-002 / Artifact 03). One additive table: `chat_message` (id **UUIDv7** PK, itinerary id, author traveler id, body ≤ 2,000, at TIMESTAMPTZ) with the `(itinerary_id, id DESC)` index — the `activity_history` read shape: UUIDv7 is the time order and the cursor.
- **Send is synchronous REST; the socket is delivery.** `POST` persists transactionally and returns the message; a `ChatMessageAppended` domain event (IDs) publishes AFTER_COMMIT; the WS bridge broadcasts the message DTO on `itinerary:{id}:chat` as `type: "chat.message.appended"` — the first real row in WS-1's topic registry. At-most-once delivery is absorbed by the catch-up convention: on reconnect the client invalidates and refetches.
- **Reads page in the standard cursor shape**, newest-first on the wire (`{items, nextCursor}`, UUIDv7 cursor); the client renders bottom-anchored and pages older on scroll-back. Compare `nextCursor` with `??`, never `!==` (the S3.1 lesson); hand it straight to react-query.
- **Author identity resolves at read**: each item carries `{travelerId, handle, displayName}` joined from the traveler row — which is what makes decision 2's departed-author rendering work with no denormalized copy. The UI renders the handle (canvas C2), display name as the handle-less fallback (S4.23's posture is stranger-surface-only; chat is members-only, names are fine).
- **Fences in order**: guard (masked not-found for non-members, both endpoints and the topic) → archive WriteFence (owner 409 / non-owner masked) → published check (`CHAT_CLOSED`, owner and member alike) → validation (blank, > 2,000: named 4xx).
- **Client**: repository + infinite query; WS events merge into the cache **deduplicated by id** (the sender receives its own broadcast — reconcile against the optimistic entry, never double-render); optimistic append on send with the C5 failed-state machine (dim → Retry re-attempts in place / Discard removes — never auto-retry, never a modal); reconnect signal → invalidate + refetch page 1; **draft persists per trip in a module-scoped store** (the S4.18 lesson — component state dies when expo-router unmounts under a pushed route), discarded on archive.
- **Pure-module seams** (the `landingSlot.ts` precedent, Jest-tested without rendering): grouping (same sender within 5 min), gap timestamps (≥ 20 min), date separators (Today / Yesterday / weekday-month-day, device-local from UTC instants), counter thresholds (visible ≥ 1,900, red at 2,000), avatar tint assignment (stable per-traveler hash into the profile palette).
- **The tab goes live** on both surfaces: `comingSoonSurface: 'chat'` removed; the tab-content component takes the `WorkspaceTravelersTab` contract (`itineraryId` prop). Register-#2 analytics on send.
- **Never log a body** (P3): message ids and traveler ids only, everywhere — server log, client console, driver output.

## Wire changes *(all additive — no ADR-008 waiver)*

- `POST /v1/itineraries/{id}/chat/messages` — `{body}` → 201, the message DTO `{id, author: {travelerId, handle, displayName}, body, at}`. Named refusals: `CHAT_CLOSED` (published), the WriteFence pair (archived), validation 4xx (blank / over-cap).
- `GET /v1/itineraries/{id}/chat/messages?cursor=` — the standard cursor shape, newest-first; same DTO items.
- WS: the `itinerary:{id}:chat` topic; event `chat.message.appended` carrying the message DTO in ADR-030's envelope. (Ticket/handshake/subscription are WS-1's wire, unchanged here.)

## Candidate-capability note *(ADR-009's standing duty)*

**`chat.message.send`** — a capability act, footprint-growing, not governance → register #14. (Pre-recorded at S4.9; discharged here.)

## Design baseline & deviations

**The design baseline is the founder's Claude Design chat canvas** (`Chat Spec.dc.html` — five artboards, a live demo frame, and two normative contract blocks), handed at the grilling's close. The **component contract C1–C6 and motion contract M1–M5 are normative** — transcribed verbatim into `design/README.md` beside this spec, which is the handoff the founder exported with the canvas. Per the mock-fidelity rule: copy the frames — bubble geometry, exact copy strings ("Say hello — the plan starts here." / "This trip is archived — chat is closed." / "Couldn't send"), the counter's 1,900 threshold, the ruled-out list — and read the canvas markup for any answer before inventing one.

Two canvas calls extend the grilling, both accepted as baseline: the **"↓ New messages" pill** (decision 7's boundary: scroll affordance, not unread state) and **per-trip draft persistence** across tab switches. One canvas note is a ruling restated: my-bubbles are the warm tinted well, not solid accent — accent stays reserved for Send.

*(Archival note: the canvas export's HTML reached this session through a lossy encoding; the founder drops the original `Chat Spec.dc.html` + `support.js` into `design/` — or records the live canvas link here — rather than trusting a re-typed copy. The transcribed contracts in `design/README.md` are clean and binding either way.)*

## Acceptance criteria

1. t1 sends; t2's open Chat tab receives it **over the socket** (asserted at the socket per WS-1's rule, not the render) and it renders per C1/C2; a reload shows it persisted. Two browser contexts, verified pool, roles stated in the write-up.
2. Send is optimistic: the bubble appears on release, the field clears immediately (C4); the server confirm reconciles by id with no duplicate when the sender's own broadcast arrives.
3. Failed send (request interception): dim to 0.55, "Couldn't send" + Retry/Discard per C5; Retry re-attempts in place; Discard removes; the composer stays usable throughout.
4. Grouping, gap timestamps, and date separators follow C1/C3 exactly (Jest on the pure module; one visual spot-check against artboard 1).
5. The cap: the composer hard-stops at 2,000 with the counter behavior per C4; a 2,001-character POST answers the named 4xx (IT).
6. A non-member gets not-found on both endpoints and the masked refusal on the topic (guard family, re-asserted per surface).
7. A departed author's messages survive and render by handle (IT: send as t2, remove t2, list shows the message with t2's handle).
8. The publish flip, both ways (IT): publish → send answers `CHAT_CLOSED` and no event fires; unpublish → send works and the history is intact.
9. Archived: the owner reads the frozen thread with the notice bar (no composer, no failed-send affordances); owner write 409, non-owner member not-found (fence family).
10. A send bumps no `planVersion`, writes no history entry, takes no lease (IT asserts all three unchanged).
11. Empty state per C6: glyph well, the exact line, composer present and auto-focused on tab entry.
12. The draft survives a tab switch away and back (module-store, not component state); it is discarded on archive.
13. Motion follows M1–M5 with the Reduce Motion cuts (M1/M3 jump-cut; opacity fades stay); nothing else animates.
14. The tab is live on both surfaces — no `comingSoon`; register-#2 analytics fire on send.
15. Device walk: send from the emulator; background the app, send from the web as t2, foreground — the missed message appears via catch-up; the LogBox banner is dismissed before composer taps (the S4.19 trap).

## Testing decisions *(the seams — highest existing ones, none new; confirm at owner review)*

Backend: HTTP-seam ITs on `PostgresTestBase` + `RestTestClient` — the guard-masking family, the fence ladder in decision order (archive pair, publish flip, validation), cursor paging against a seeded thread, the departed-author read, the no-plan-side-effects triple, and the AFTER_COMMIT event assertion through a test subscriber (WS-1's IT client). Mobile: Jest on `chatThread.ts` (grouping/timestamps/dates/counter/tints) and the send state machine (optimistic → confirmed / failed → retried/discarded — injected clock, no `Date.now()` in what a test must steer); repository tests per the existing families. Harness: one two-context Playwright spec walking AC 1–3 + 9 + 11; the device walk for AC 15. No new seams; the socket plumbing is WS-1's. **Proven at WS-1 for delivery** (two browser contexts on `debug:echo`, sabotage-verified) but **NOT for reconnect or lifecycle** — WS-1 deferred its reconnect spec and device walk here, because nothing subscribed to a topic until this story, so `reconnectIfDead()` had no consumer to exercise. **This story inherits both**: kill-the-connection-mid-spec (backoff → reconnect → resubscribe → the thread refetches) and the background/foreground device walk.

## Out of scope

Photos in chat (dismissed on the record — decision 8) · edit/delete/threading/mentions (decision 1; deletion's park carries the trigger) · unread state, receipts, typing, reactions, presence, push (decision 7's block, parked) · the activity-history surface (**S4.27**, split here, unscheduled) · any published/consumer surface for chat (decision 6) · entitlement code (`chat.message.send` is a note, not a gate — ADR-009) · a chat door on the published view (decision 3 closed it: publish turns chat off) · broker/scale-out (WS-1's named seam).

## Comments

**2026-08-20, owner review — passed.** All five tickets approved as written ("tickets are all good"); statuses flipped `needs-triage` → `ready-for-agent`. Implementation deliberately not started — the owner triggers the build, and WS-1 goes first. Still owed by the founder: the original `Chat Spec.dc.html` + `support.js` dropped into `design/` (or the live canvas link recorded there) — the transferred copies were encoding-mangled, per the spec's archival note.

**2026-08-21, founder ruling at the build — the composer caps at THREE lines, not four, and the canvas is superseded on this one number.** The canvas states four in three separate places (C4's prose, artboard 3's section label *"4-line max, then inner scroll"*, and M3's *"up to the 4-line max"*), so this is a deliberate deviation from the design baseline rather than a fidelity miss, recorded here because the mock-fidelity rule requires a deviation be *said* rather than left to read as an approximation. The reason it came up at all: the field was **starting taller than one line**, which made the whole control feel bigger than the frame — see the defect note below. `chatMetrics.fieldMaxLines` is the single place the cap lives; `design/README.md` keeps the founder's original wording with a pointer to this ruling.

**The resting-height defect this surfaced (worth keeping — it is an RN-web measurement trap).** `onContentSizeChange` reports a content height that **includes the field's vertical padding** on react-native-web, so the original `round(contentSize.height / lineHeight)` measured an *empty* field as `round(39 / 19)` = **2 lines** and the composer opened at roughly double its intended height. Nothing below a rendered browser can see this: the arithmetic is correct in isolation, `tsc` has no opinion, and on native the same call reports a different basis — so it is the `Alert.alert` / `<Image>`-headers family, an RN API whose two platform implementations disagree about what a number means. The fix subtracts the padding before dividing, and the calculation moved into `linesFilled()` in `chatThread.ts` so it is Jest-testable without rendering (the `landingSlot.ts` precedent).

**2026-08-21, second founder ruling — the workspace tab row SPANS the width, superseding the canvas's right-alignment.** All five artboards set the tab strip to `justify-content: flex-end`; it now carries `justifyContent: 'space-between'` + `flexGrow: 1`. Recorded here beside the three-line cap because the mock-fidelity rule wants a deviation *said*, and a review found this one living only in a commit body. **Two things bound it:** at the canvas's own 390px frame the measurements are byte-identical before and after (first tab at 17, last at 389), so the frame the mock specifies is unchanged and this is strictly a wider-viewport fix — at 1280 the app shell centres in a ~372px column and the tabs previously packed left, leaving white space after Chat. And it changes `WorkspaceTabRow`, which **all five tabs share**, so it is not a chat-local change; the full web suite is the guard.

**2026-08-21, review pass — three defects fixed, and the fence-order one is worth keeping.** (1) The **"↓ New messages" pill fired on a bare scroll-up**: the effect set `unseen` whenever the reader left the bottom, with no memory of what had already been seen, so scrolling up through history offered to jump you back for nothing. It now remembers the newest id it has shown you. (2) The optimistic reconcile **matched on body text**, so sending the same word twice in flight made the second bubble vanish when the first confirmed — it now retires exactly one twin per confirmed message. (3) **Validation ran before every fence**, because `@Valid` resolves during argument binding and the guard runs in the handler body: a blank body on an archived trip answered `VALIDATION_FAILED` rather than `TRIP_ARCHIVED`, inverting the order this spec's Mechanics fixes. Dropping `@Valid` puts the service's own named refusals (`CHAT_MESSAGE_BODY_MISSING` / `CHAT_MESSAGE_BODY_TOO_LONG`) after the fences, which is both the ordering the spec asks for and better wire names than the generic one. **It was never a masking leak** — a non-member's trip and a nonexistent trip both answered the same `400`, so the two outcomes stayed indistinguishable — and that was checked rather than assumed before deciding how much it mattered.
