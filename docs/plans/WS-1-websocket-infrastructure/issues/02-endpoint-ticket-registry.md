# 02 — The endpoint: ticket handshake, session registry, connection hygiene, origin posture

**What to build:** the `/ws` upgrade endpoint and everything that guards a *connection* (a *subscription* is ticket 03): the single-use ticket flow, the session registry, heartbeats, the bounded send queue, and the Origin posture.

**Blocked by:** 01 — the spike's evidence (query-param integrity decides ticket-vs-first-frame).

**Status:** done

- [x] `POST /v1/ws-ticket` — authenticated through the existing chain; returns `{ticket, expiresInSeconds: 30}`; opaque value, single-use, in-memory store with TTL sweep. Never logged (P3 — log the traveler id, not the ticket).
- [x] `GET /ws?ticket=…` upgrade: redeem-and-burn; refuse the upgrade on reuse/expiry/absence/garbage. The session binds the resolved traveler id for its lifetime.
- [x] Origin validation at handshake: dev-profile allowlist bean carrying `DevCorsConfig`'s values; absent `Origin` allowed (native clients); prod = no bean = browser origins refused. Boot-4 note: verify the actual starter/module names at build time — the Flyway-starter/autoconfigure-split gotcha family; don't trust Boot 2/3-era examples.
- [x] Server ping every 30s; close after 2 missed pongs. Bounded per-session send queue (256); overflow closes the session with a named close code.
- [x] Frame protocol skeleton: parse `{action, …}` JSON; unknown actions answer `{action: "error", code}` and are ignored; malformed frames close.
- [x] Metrics/logs: session count, closes by reason — IDs only, never frame contents.
- [~] ITs (Java WS client on `PostgresTestBase`): the ticket family is complete at the handshake — **admit once · refuse reuse · refuse expired · refuse absent · refuse garbage**, plus the on-the-instant boundary (`ConnectionTicketIT`, 8 tests, steerable clock) · the origin invariant pair is complete (`DevOriginPostureIT` + `ProdWebSocketPostureIT`). **`missed-pong close` and `queue-overflow close` are UNIT-tested, not IT-tested** (`SessionTest`, with a latch-blocked socket for the slow consumer; the queue-limit sabotage was confirmed to fail the test). Driving a real socket into two missed pongs needs a 90s IT or an injected heartbeat period; the unit test exercises the same code path and names its own failure mode, so the gap is the *rung*, not the coverage.

## Comments

**2026-08-20, implementation — two boxes narrowed on review, and what the logs actually carry.**

- **Metrics/logs.** Connect logs `travelerId` + session count; close logs the **close code, the close reason** (`SLOW_CONSUMER` / `UNRESPONSIVE` / `NO_LONGER_A_MEMBER` — the named codes carry through), session count and the subscription total; eviction logs `itineraryId`, `travelerId` and how many subscriptions were dropped. **IDs only — no frame contents, no ticket value** anywhere (P3). Per-*topic* subscription counts are reachable (`SessionRegistry.subscriptionCount`) but are not metered on a timer; the spec's "per-topic subscription counts logged/metered" is therefore only half-done, and the missing half wants a metrics registry this repo does not yet have. Raised rather than smuggled.
- **The heartbeat rung.** `HeartbeatSchedulingIT` proves the scheduler actually registered both tasks — which is the cheap signal that `@EnableScheduling` is on and the SpEL rate expressions resolved, because *a heartbeat that never fires looks exactly like one that does*. It does **not** wait 90s to watch a real socket die. That, and the 90s hold, belong with ticket 01's deployed proof.
