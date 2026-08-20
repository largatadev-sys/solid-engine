# 04 — The envelope, the AFTER_COMMIT bridge, and the dev echo topic

**What to build:** the event path — domain event in, envelope frame out — with the commit boundary in the right place, plus the dev-only proving topic.

**Blocked by:** 03 — fan-out targets subscriptions.

**Status:** needs-triage

- [ ] The envelope: `{topic, type, eventId (UUIDv7), at (UTC instant), payload}` — one serializer, owned by the WS module. Additive-evolution rule recorded in ADR-030; nothing here versions or breaks.
- [ ] The bridge: `@TransactionalEventListener(phase = AFTER_COMMIT)` on domain events that name a topic — a broadcast can never precede its commit; a rollback broadcasts nothing. Events carry IDs (ADR-002); if a payload needs entity data, the bridge reads it through the owning module's service interface.
- [ ] Fan-out behind an interface (the broker seam, named in the spec): the in-process implementation iterates the topic's subscriptions and enqueues; the interface is the single point a broker would replace.
- [ ] `debug:echo`: dev-profile bean only (the `DevCorsConfig` binding pattern); any subscriber's `{action: "echo", payload}` frame broadcasts to the topic in the envelope shape (`type: "debug.echo"`). Absorbs ticket 01's spike handler.
- [ ] ITs: the AFTER_COMMIT pair (rolled-back publish → silence; committed publish → envelope arrives, shape asserted field by field) · multi-subscriber fan-out (two sessions, both receive) · prod invariant: no `debug:echo` bean, subscribe to it answers the error frame (paired with ticket 02's origin invariant).
