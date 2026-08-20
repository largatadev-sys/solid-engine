# WS-1 — WebSocket infrastructure

**Status:** specced — awaiting owner review *(flips to ready-for-agent at the owner's pass — the S4.19/S4.20 precedent)* · **Epic:** none (infrastructure, the H1 shape) · **Depends on:** H1 (shipped — the Playwright suite the harness proof lands in) · **Consumed by:** S4.10 (in-trip chat, the first real topic)

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** ADR-030 (minted with this spec — the transport reversal, the envelope, the catch-up convention) · ADR-002 (modules by ID + service interface; the WS module listens to domain events, never reaches into another module's tables) · ADR-008 (additive evolution — extended by ADR-030 to socket payloads) · Artifact 03 (the guard; a topic subscription is an authorization act) · P3 (never a bearer token in a URL) · the S0.4 CORS lesson (browser-facing auth must be wired where the security chain can answer it) · the repo's standing doctrine that a check must have a failure mode (a connected-and-dead socket looks exactly like a connected one).

## The pull, on the record

Founder ruling, 2026-08-20, at the S4.10 grilling (three rounds): **chat ships on WebSockets, and the infrastructure builds first as its own story.** This reverses the recorded pull-based posture ("no sockets, no push, no broadcast" — ADR-014's family) on the record; ADR-030 carries the reversal. The infrastructure is deliberately generic — a topic registry, not a chat pipe — because its second and third consumers (polls closing, presence someday) are already visible. **No traveler-visible surface ships here**; the story is proven by ITs, the harness, and a dev-only echo topic.

## Goal

A production WebSocket layer in the existing backend and app: authenticated connections, guard-checked topic subscriptions, domain-event fan-out, and a client connection manager — such that S4.10 can ship chat by adding one table, two endpoints, and one topic registry row.

## Locked decisions *(founder, 2026-08-20, in grilling order)*

### 1 · One ADR carries the infrastructure; consumer decisions stay in consumer specs

ADR-030: the transport reversal, the envelope, the additive-evolution rule, the catch-up convention. Chat's own rulings live in S4.10's spec.

### 2 · The spike is ticket 01 and it blocks the build

A half-day echo-over-`wss://`-through-Railway proof, held past the idle window on heartbeats, from a real browser through the real edge proxy. Verify at the layer that ships before building a session registry on unverified proxy behavior.

### 3 · Handshake auth is a single-use short-TTL ticket

`POST /v1/ws-ticket` (authenticated, HTTPS) returns an opaque token; the client passes it as a query param on the upgrade; the server redeems and burns it. ~30s TTL, in-memory store (correct on a single instance). The browser's WebSocket API cannot send an `Authorization` header, and a bearer token in a URL is a P3 violation — a burned ticket in an access log is worthless. First-frame auth is the recorded fallback if the spike shows the edge mangling query strings.

### 4 · The envelope, and its two binding rules

Every server-pushed event is `{topic, type, eventId, at, payload}` — `eventId` a UUIDv7, `at` a UTC instant. Rule one: **socket schemas evolve additively only** (ADR-008 extended — old installed apps hold connections against new servers for weeks). Rule two: **clients silently ignore unknown event types** — the rule that lets the server grow topics without stranding old apps.

### 5 · Subscription is an authorization act; membership changes evict

Subscribing to a trip's topic resolves the Membership through the guard, exactly like a service method; a non-member gets the masked refusal. Removal/leave closes the departing member's subscriptions to that trip's topics, published after the membership delete commits — the same flow that releases leases at S1.5. IT-proven: the removed member's socket goes silent.

### 6 · Connection hygiene: closed, never buffered unboundedly

Server ping every 30s, close after 2 missed pongs. Bounded per-session send queue (256 events); a consumer that can't drain is closed and resyncs via catch-up. Engineering defaults, recorded so they're facts rather than folklore; tune only if the spike or the device rung disagrees.

### 7 · The harness proves delivery in-page — no new `ws` dependency

H1 deleted the hand-rolled `ws` layer deliberately; it stays deleted. The web project asserts socket arrival with two browser contexts (pool travelers); backend ITs use a Java WS client; one device walk proves reconnect-after-background. A Node WS client tests a client no traveler runs — add one only if a server behavior proves unprovable through the browser.

## Mechanics *(the decisions' consequences)*

- **One endpoint, multiplexed topics.** A single `/ws` upgrade per client; JSON frames. Client→server: `{action: "subscribe" | "unsubscribe", topic}`. Server→client: the event envelope, plus `{action: "subscribed" | "unsubscribed", topic}` acks and `{action: "error", code}`. Unknown inbound actions answer an error frame and are otherwise ignored.
- **Topic names are parsed, never trusted**: `itinerary:{id}:{channel}` resolves the itinerary and runs the guard; `debug:echo` exists only where its dev-profile bean does.
- **Fan-out rides domain events.** Publishing modules raise events (IDs only, ADR-002); the WS module's listener is `@TransactionalEventListener(phase = AFTER_COMMIT)` — a broadcast can never precede its commit, and a rolled-back write broadcasts nothing. Delivery is therefore **at-most-once, deliberately**: the database is the source of truth, the socket is a latency optimization, and the catch-up convention (below) absorbs any gap.
- **Catch-up is a convention, not a feature**: every consumer must be able to re-read its state over REST after a reconnect (chat: invalidate + refetch). The connection manager surfaces a reconnect signal; each subscriber decides what to refetch. Event `eventId`s (UUIDv7) make "anything after X" cheap wherever a consumer wants finer grain.
- **In-process fan-out, broker seam named and not built**: the fan-out sits behind an interface; the day the backend scales past one instance, a broker implementation replaces it with its own ADR. Not before.
- **Origin posture mirrors CORS**: WS handshakes bypass CORS, so the server validates `Origin` itself. A dev-profile allowlist bean carries the same values as `DevCorsConfig` (localhost:8081/8083, `10.0.2.2` variants); an absent `Origin` header is allowed (native clients send none); in prod no bean exists, so any browser origin is refused — with a `ProdCorsAbsentIT`-mold invariant test.
- **The client connection layer lives in the repository tier** (ADR-001 — UI never touches the socket): one connection per app session, ticket fetch through the typed apiClient, reconnect with exponential backoff + jitter (1s doubling to a 30s cap), resubscribe-all + reconnect signal on recovery, `AppState` foreground reconnect (Android kills background sockets), and a `useTopicSubscription(topic, onEvent, onReconnect)` hook as the only consumer API. The `ws(s)://` URL derives from the already-inlined `EXPO_PUBLIC_API_BASE_URL` value at runtime (`http→ws`, `https→wss`) — no second baked variable, no new literal-access surface.
- **The dev echo topic is the proving consumer**: `debug:echo` (dev profile only — the `DevCorsConfig` binding pattern) broadcasts any subscriber's `{action: "echo", payload}` frame back to the topic. It gives the spike, the harness spec, and future debugging a real topic with zero domain coupling; prod absence gets its invariant test.
- **Observability without payloads**: connected-session and per-topic subscription counts logged/metered; traveler and itinerary **IDs only**, never frame contents (P3).

## Wire changes *(all additive — no ADR-008 waiver)*

- `POST /v1/ws-ticket` — authenticated; → `{ticket, expiresInSeconds}`. Single-use, ~30s.
- `GET /ws?ticket=…` — the upgrade endpoint (outside `/v1` — it is not a REST resource; its contract is ADR-030's envelope).
- The frame protocol and envelope as above. No existing endpoint changes.

## Candidate-capability note *(ADR-009's standing duty)*

**None.** System transport: no traveler act, no footprint growth. (Consumers carry their own notes — S4.10 records `chat.message.send`.)

## Acceptance criteria

1. **The spike's evidence is recorded in ticket 01**: an echo round-trip over `wss://` through the Railway edge, connection held ≥ 90s on heartbeats, from a real browser.
2. Ticket flow (IT, Java WS client): a valid ticket admits exactly once; reuse, expiry, absence, and garbage each refuse the upgrade.
3. A member's subscribe to their trip's topic acks `subscribed`; a non-member's gets the masked refusal — the guard-family IT, on the socket.
4. A removed/departed member's live subscription is closed and receives nothing further (IT: subscribe, remove, publish, assert silence).
5. An event raised in a transaction that rolls back reaches no subscriber; one raised in a committed transaction arrives with the envelope shape (AFTER_COMMIT IT pair).
6. A client receiving an unknown event type ignores it without error (Jest on the dispatcher — the ADR-030 tolerance rule).
7. A session that stops draining is closed at the bounded-queue limit; a session that misses two pings is closed (unit/IT).
8. Dev profile: `localhost:8081` origin admitted, absent Origin admitted; prod profile: browser origins refused, `debug:echo` absent (invariant pair, `ProdCorsAbsentIT` mold).
9. Playwright (web project): two browser contexts on `debug:echo` — one sends, the other receives **over its socket** (asserted at the socket, not the render), through the preview container against the local stack.
10. Device walk: background the app, foreground it — the connection re-establishes and resubscribes (logcat + the echo topic).

## Testing decisions *(the seams)*

Backend: ITs on `PostgresTestBase` with a real Java WebSocket client — the ticket family, the guard-on-subscribe family, eviction, the AFTER_COMMIT pair, hygiene closes. Origin posture as the profile-pair invariant tests. Mobile: Jest on the pure seams (frame dispatcher, backoff schedule, resubscribe bookkeeping — the `landingSlot.ts` extraction precedent; reanimated-free, so no import hazards). Harness: the two-context echo spec. The connection manager's reconnect loop is exercised by the Playwright spec (kill the socket server-side mid-spec) rather than mocked.

## Out of scope

Any traveler-visible surface (S4.10) · a broker / horizontal scaling (seam named, ADR for its day) · presence, typing, live editing (ADR-014/022's invalidating condition does **not** fire because a transport shipped) · push notifications (a different decision, unmade) · catch-up-by-eventId server endpoints (consumers refetch their own REST reads; finer grain when a consumer needs it) · any change to existing REST endpoints.

## Comments
