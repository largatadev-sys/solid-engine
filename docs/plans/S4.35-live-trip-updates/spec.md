# S4.35 — Live trip updates: the traveler topic

**Status:** specced — awaiting owner review *(flips to ready-for-agent at the owner's pass — the S4.19/S4.20 precedent)* · **Epic:** E4 · **Depends on:** WS-1 (shipped — the transport), S4.10 (shipped — the first subscription client patterns), **S4.34 (this pull — its focus revalidation is what the reconnect contract fetches on)**, S4.28 (shipped — the roster, join requests and the inbox this lights up)
**Grilled:** 2026-08-24 (grill-with-docs, four rounds) — founder rulings recorded per question below.
**ADR:** **ADR-030 amended** (a second topic subject kind; the narrow-audience frame rule; the async dispatcher). No new ADR — it is the same decision growing a subject, and splitting it would put the topic grammar in two documents.
**Design record:** the settled design published as an artifact, *The Traveler Topic* — the two subjects, the subscribe-time fan-in, one event's journey, the audience rule and the fan-out bound, drawn from the code.
**Candidate-capability note:** **None.** System transport plus freshness of existing reads: no new traveler act, no footprint growth. (The acts that raise these events — editing, inviting, approving — carry their own notes in their own stories.)

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** ADR-030 (the transport, the envelope, additive socket evolution, the catch-up convention — amended here) · ADR-002 (modules by ID + service interface; the WS module listens, never reaches into another module's tables) · ADR-008 as extended by ADR-030 (old installed apps hold connections against new servers for weeks; clients ignore unknown event types) · Artifact 03 (a topic subscription is an authorization act) · ADR-022 (the Editing Session exists *because* live co-editing sync does not — unchanged by this story, and the spec says so explicitly) · S4.10's `useChatDelivery` (the absorb-and-catch-up pattern this generalizes) · the repo's standing doctrine that a check must have a failure mode.

## Problem Statement

The transport shipped at WS-1 and has exactly one consumer. `fanout.broadcast` has a single call site — `ChatTopic` — and every topic in the product names a trip: `itinerary:{id}:{channel}`, subscribed explicitly by the client while that trip's chat is open, authorized by the guard.

That subject cannot serve the surfaces the founder named. **Trips shows every trip you belong to at once**, so per-trip subscription means N subscriptions and N guard resolutions per viewer; and it structurally **cannot deliver an event about a trip you are not yet a member of**, because the guard would refuse the subscription — which is precisely the event that makes an approved trip appear.

So the screens lag. The *"being edited by…"* card on Trips is the founder's named example: a co-member opens an Editing Session and the card that exists to say so does not move until something refetches. S4.34 makes it correct when you return to the screen; it cannot make it correct while you are sitting on it, which is where that card is read.

Two things are also wrong in the transport itself, found while tracing this design and true today with chat live:

- **Fan-out is synchronous on the writing traveler's HTTP request thread.** `AfterCommit` runs on the committing thread, `InProcessFanout` loops the subscribers, and `Session.send` drains inline with a **blocking** `socket.sendMessage`. A client that stopped reading — a phone in a tunnel, which sends no FIN and stays open for minutes — stalls the loop, and with it another traveler's POST.
- **The heartbeat is serial on a single-threaded scheduler.** `Heartbeats.pingEverySession()` walks every session calling a blocking ping, and no `TaskScheduler` bean or `spring.task` config exists, so Boot's default pool of **one** thread carries both it and the ticket sweeper. One stalled socket delays heartbeats for every session behind it — meaning **the mechanism that detects dead sessions is blocked by dead sessions**, and the ticket sweeper stalls with it. `Session.send`'s `synchronized(socket)` is the same monitor the ping takes, so a stalled drain blocks the scheduler before it attempts a write.

## Solution

A second topic subject, addressed to a person rather than to a place:

- **`traveler:{id}`** — one subscription per app session, authorized by identity rather than by membership. On subscribe the server resolves that traveler's memberships **once** and registers the session under each of their trips' topics inside `SessionRegistry`. Broadcasts stay per-trip and small; **no query runs per event**. WS-1's `MembershipEvictionListener` already removes registrations on departure; its mirror adds one on admission, which is also how a newly-approved traveler receives the event announcing it.
- **Seven event types**, each either carrying what changed (the client writes it straight into the react-query cache) or signalling that something changed (the client refetches). The rule that decides which: **an event whose audience is narrower than its topic carries no payload** — a contentless frame cannot leak, and REST stays the sole authority on what a viewer may read.
- **Reconnect marks stale and lets focus fetch** (S4.34's mechanism), so a commuter's background/foreground cycling costs nothing until they look at something.
- **The dispatcher goes asynchronous** and the scheduler gets a real pool, closing the head-of-line blocking above. This is small because the structure already exists: `Session` has `pending`, `writing`, overflow detection and `drain()` — only the thread `drain()` runs on is wrong.

Home, Discover and Profile stay pull-based on S4.34's revalidation. That is arithmetic, not preference: fan-out is proportional to *writes × audience*, and a public feed's audience is every online traveler.

## User Stories

1. As a trip member sitting on Trips, I want the "being edited by…" card to appear and clear as a co-member starts and finishes editing, so that I learn the trip is busy without tapping into it.
2. As a trip member, I want a co-member's saved plan to be reflected on my Trips card while I am looking at it, so that I am never one save behind.
3. As a traveler, I want a trip I have just been approved into to appear in Trips without my doing anything, so that approval feels like an event rather than a thing I have to go and check.
4. As a traveler, I want an invitation to show up in the Trips inbox the moment it is sent, so that I am not the last to know I have been invited.
5. As a trip owner on the Travelers tab, I want a new join request to appear in the queue as it arrives, so that approving people does not require refreshing.
6. As a trip member on the Travelers tab, I want the roster to reflect joins and departures as they happen, so that the list I am reading is the list that exists.
7. As a traveler on a flaky connection, I want the app to reconcile itself when it reconnects, so that a tunnel costs me nothing beyond the tunnel.
8. As a traveler saving a plan, I want my save to complete at its own speed, so that another member's dead connection never becomes my problem.

## Locked decisions *(founder, 2026-08-24, in grilling order)*

### 1 · The subject is the traveler, and there is exactly one subscription per session

`traveler:{id}`, subscribed when the socket opens and held for the app session. Authorization is identity — *is this you?* — and a subscription to anyone else's is refused with the guard family's masked refusal. The alternative (a topic per trip on screen) was priced and rejected: at 20 trips × 1,000 travelers it is 20,000 registry entries and 20,000 guard resolutions against 1,000, and it cannot express `membership.granted` at all.

### 2 · Memberships resolve once, at subscribe — never per broadcast

One query when the session subscribes; the server registers it under each trip topic. Asking *"who are this trip's members?"* on every broadcast would put a database read back on the write path this design exists to keep clean.

### 3 · Absorb what is cheap, refetch what is not

Events carrying a small payload are written straight into the react-query cache — **zero queries**. Only `membership.granted` refetches, because a whole trip must appear and the client holds none of its data. The `ItineraryResponse` list item **already carries** `beingEdited`, `lease`, `editingSession` and `lastEditedBy*`, so the absorbed fields have somewhere to land and no REST change is needed.

### 4 · Reconnect marks stale; focus fetches

Not "invalidate everything on every reconnect" — mobile foreground/background cycling would fire that dozens of times a day. `invalidateQueries({ refetchType: 'none' })` on reconnect, and S4.34's focus revalidation does the fetch when a screen is actually being read. This also self-heals any absorb-drift at the next focus, without a scheduled sweep.

### 5 · An event whose audience is narrower than its topic carries no payload

The join-request queue is owner-only (`useJoinRequests` is enabled for the owner alone), so a payload on a trip-wide frame would tell ordinary members what REST withholds. Filtering per subscriber at fan-out was rejected — it costs a separate serialization per session — and a dedicated owner channel was rejected because ownership transfer would have to move the registration, silently, or break. The contentless signal has neither problem: non-owners receive it and do nothing, because that query is not mounted for them.

### 6 · Trips, its inbox header, and the Travelers tab

`InvitationInbox` renders as the `ListHeaderComponent` of the Trips list — it is not a fifth surface, it is the top of the screen the founder named. The Travelers tab's roster and approval queue were pulled in by founder call on the record, discharging the epic-map park *"Live roster / requests / inbox updates over the socket"* (2026-08-22, Q27).

### 7 · One instance, pinned, with an enforceable trigger

The ticket store is in-memory and the fan-out in-process — "correct on a single instance" (WS-1 decision 3). Two replicas means tickets minted on A are unredeemable on B and broadcasts on A never reach B, presenting as intermittently dead sockets with no failing test and no log line naming it. **The service is pinned to one replica**, and the broker trigger is the **instance count changing** — not a connection number, because we have no instrument that would measure one honestly.

### 8 · The async dispatcher ships here, not on a later trigger

Head-of-line blocking is a live defect, not a scale concern: a traveler's save can stall for as long as Tomcat's blocking send timeout because another member's phone is in a tunnel, and the symptom — *"saving is sometimes slow"* — points straight at the database. No local rung produces a slow consumer, so nothing would catch it. It is folded into this story's first ticket because the queue already exists and only the draining thread is wrong.

### 9 · The proof is a slow consumer, not a load number

A connection-ceiling measurement taken against a Testcontainers box is a number we would be tempted to trust about Railway. Dropped. The precise proof is one session that stops reading while another traveler's POST completes normally — a real failure mode (revert the dispatcher and the POST hangs), using WS-1's existing **Java** WS client, so no Node `ws` client returns (H1 deleted it deliberately; WS-1 ruled against it).

### 10 · ADR-030 is amended, and the amendment says what this is not

Broadcasting an Editing Session's start and end **is not live co-editing sync**. ADR-022 chose an exclusive session precisely because that sync does not exist, and that condition has not changed: the boundaries are pushed rather than polled, and the plan inside them is still read at its last saved state. Recorded in the amendment so a future reader does not read the broadcast as the beginning of collaborative editing and build on it.

## Mechanics *(the decisions' consequences)*

- **Topic grammar.** `Topic.parse` gains a two-segment `traveler:{uuid}` form beside `debug:echo` and the three-segment `itinerary:{uuid}:{channel}`. No channel segment: the client subscribes to all of it, so a subset has no consumer. The parser is where masking begins, so a garbage or foreign id must refuse identically to a well-formed one belonging to somebody else.
- **Subscription and registration.** Subscribing to `traveler:{id}` checks identity, resolves memberships once, and registers the session under each `itinerary:{id}:*` topic it belongs to. `SessionRegistry` already maps both directions and needs no new shape.
- **Admission mirrors eviction.** `MembershipEvictionListener` removes a departing member's registrations after the membership delete commits (S1.5's flow); the mirror adds registrations after a membership **grant** commits, and does so **before** `membership.granted` is broadcast — or the traveler the event is about is the one traveler who does not receive it.
- **The events**, all raised `AFTER_COMMIT` (a rolled-back write broadcasts nothing) and all fanned onto the trip's topic, which reaches members through their registrations:

  | Event | Frame | Client response | Surface |
  |---|---|---|---|
  | `editing-session.acquired` | payload | absorb into the cached trip | Trips — the "being edited by…" card |
  | `editing-session.released` | payload | absorb into the cached trip | Trips — the card clears |
  | `plan.saved` | payload | absorb the new plan version | Trips — reflects a co-member's save |
  | `membership.granted` | **signal** | refetch trips + inbox | Trips — a trip appears, the pending row clears |
  | `invitation.received` | payload | absorb into the inbox | Trips — the inbox header |
  | `join-requests.changed` | **signal** | refetch, owner only | Travelers tab — the approval queue |
  | `roster.changed` | **signal** | refetch members | Travelers tab — the roster |

  `membership.granted` does double duty: approving a join request both makes the trip appear and clears the pending row from the inbox header — one event, two parts of one screen.
- **Raise sites.** `EditLeaseService` (acquire/release), the plan bulk save (`plan.saved`), `JoinService` (`membership.granted`, `join-requests.changed`), the invitation issue paths (`invitation.received`), membership grant/removal (`roster.changed`). Each raises through the existing `AfterCommit` seam; no module reaches into another's tables (ADR-002).
- **The client.** One `useTopicSubscription(travelerTopic, …)` held at the root, beside `useSocketLifecycle`. A dispatcher maps event type → handler; **unknown types are ignored silently** (ADR-030's tolerance rule, already Jest-tested at WS-1). Absorb handlers write through `queryClient.setQueryData`; signal handlers `invalidateQueries`, with the owner-only one guarded by nothing at all — the query is simply not mounted for a non-owner, so the invalidation is a no-op.
- **The async dispatcher.** `Session.send` enqueues and hands `drain()` to a bounded executor rather than running it on the caller's thread; `SEND_QUEUE_LIMIT = 256` and the overflow close are unchanged. `Heartbeats` gets a real `TaskScheduler` pool (and the ping stops being the only thing standing between a dead socket and its own detection). Shutdown drains or abandons cleanly — an executor that outlives the context is its own defect.
- **The replica pin** is configuration, recorded where the deployment lives, with the constraint stated rather than remembered.

## Wire changes *(all additive — no ADR-008 waiver)*

- **A new topic subject**, `traveler:{id}`, on the existing `/ws` endpoint. No new REST endpoint.
- **Seven new event types** on the existing envelope. ADR-030's tolerance rule means an old installed app receiving one ignores it.
- **No `/v1` change of any kind.** Verified rather than assumed: `ItineraryResponse` already carries `beingEdited`, `lease`, `editingSession` and `lastEditedBy*`, and the inbox and roster responses already carry what their events would absorb.

## Acceptance criteria

1. Two travelers, two contexts: t1 sits on Trips; t2 acquires an Editing Session on a shared trip. **t1's card changes with no refresh and no navigation** — asserted at the socket *and* at the render, sabotage-verified by breaking the broadcast.
2. t2 releases the session (or saves the plan) — t1's card clears / reflects the save, same conditions.
3. A non-member never receives a trip's events through their own traveler topic (IT), and a **removed** member stops receiving them (IT — the eviction family, extended to the new subject).
4. Subscribing to another traveler's `traveler:{id}` is refused with the masked refusal; a garbage id and a well-formed foreign id are **indistinguishable** in the response.
5. An owner approves a join request: the approved traveler's Trips list gains the trip **and** their pending inbox row clears, from one event, without a manual refresh.
6. An invitation sent by handle appears in the recipient's Trips inbox header without a refresh.
7. Owner on the Travelers tab sees a new join request arrive; **a non-owner member on the same tab receives the frame and issues no request** (proven by observed requests — the absence is the assertion, so the check states its own failure by first showing the owner's refetch).
8. The roster reflects a join and a departure while the tab is open.
9. **The slow-consumer proof:** one subscribed session stops reading; another traveler's POST to the same trip completes normally. Sabotage-verified — reverting the dispatcher must hang the POST.
10. **The heartbeat proof:** with one unresponsive session present, every other session still receives its pings on schedule and the unresponsive one is closed as `UNRESPONSIVE`.
11. Reconnect: the socket is killed mid-spec; the client backs off, reconnects, resubscribes, marks its queries stale, and **fetches on the next focus** — not before.
12. **Device walk:** background the app, have a second traveler edit and then approve a request, foreground — Trips is correct. This is WS-1's AC 10, deferred once into S4.10 and again out of its ticket 04; it is closed here on a **release APK on the founder's phone**.
13. An event type the client does not know is ignored without error (extends WS-1's existing dispatcher test to the new subject).

## Testing decisions *(the seams)*

Backend ITs on `PostgresTestBase` with WS-1's Java WebSocket client: the identity-authorization family (AC 3, 4), admission and eviction on the new subject, the `AFTER_COMMIT` pair per event, the slow-consumer and heartbeat proofs (AC 9, 10 — a client that opens and then stops reading is the fixture, and it is the only fixture that can prove either). Mobile Jest on the pure seams: the event→handler dispatch table, the absorb functions (given a cached page and an event, the resulting page — the `absorbIntoThreadCache` precedent), and the reconnect decision. **No component rendering.** Playwright (web project) for AC 1, 2, 5, 6, 7, 8, 11 across two browser contexts, through the preview container against the local stack. AC 12 on a release APK.

**Run the full `npx jest` once before any push that adds a file under `src/`** — `--changedSince` cannot see the 22 structural suites (S4.28's lesson), and this story adds several modules.

## Out of scope

Push on Home, Discover or Profile (**S4.34** covers their freshness; a public feed topic needs a fan-out design this story does not attempt — the audience is every online traveler, not a trip's members) · a broker / horizontal scaling (WS-1's named seam; the trigger is stated in decision 7) · presence, typing indicators, read receipts, unread counts (ADR-030's parked block, unchanged) · push notifications (a different decision, still unmade) · **live co-editing sync** — explicitly not begun here, see decision 10 · catch-up-by-`eventId` server endpoints (consumers refetch their own REST reads) · caching the feed's viewer-independent first page (epic-map line) · any change to what these surfaces render.

## Comments

*(none yet — appended during implementation)*
