# 02 — The endpoint: ticket handshake, session registry, connection hygiene, origin posture

**What to build:** the `/ws` upgrade endpoint and everything that guards a *connection* (a *subscription* is ticket 03): the single-use ticket flow, the session registry, heartbeats, the bounded send queue, and the Origin posture.

**Blocked by:** 01 — the spike's evidence (query-param integrity decides ticket-vs-first-frame).

**Status:** needs-triage

- [ ] `POST /v1/ws-ticket` — authenticated through the existing chain; returns `{ticket, expiresInSeconds: 30}`; opaque value, single-use, in-memory store with TTL sweep. Never logged (P3 — log the traveler id, not the ticket).
- [ ] `GET /ws?ticket=…` upgrade: redeem-and-burn; refuse the upgrade on reuse/expiry/absence/garbage. The session binds the resolved traveler id for its lifetime.
- [ ] Origin validation at handshake: dev-profile allowlist bean carrying `DevCorsConfig`'s values; absent `Origin` allowed (native clients); prod = no bean = browser origins refused. Boot-4 note: verify the actual starter/module names at build time — the Flyway-starter/autoconfigure-split gotcha family; don't trust Boot 2/3-era examples.
- [ ] Server ping every 30s; close after 2 missed pongs. Bounded per-session send queue (256); overflow closes the session with a named close code.
- [ ] Frame protocol skeleton: parse `{action, …}` JSON; unknown actions answer `{action: "error", code}` and are ignored; malformed frames close.
- [ ] Metrics/logs: session count, closes by reason — IDs only, never frame contents.
- [ ] ITs (Java WS client on `PostgresTestBase`): the ticket family (admit once; refuse reuse/expired/absent/garbage) · missed-pong close · queue-overflow close · the origin invariant pair (dev admits `localhost:8081` + absent Origin; prod refuses browser origins — `ProdCorsAbsentIT` mold).
