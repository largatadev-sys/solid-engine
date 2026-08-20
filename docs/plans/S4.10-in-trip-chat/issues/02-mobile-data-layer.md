# 02 — The mobile data layer: repository, live merge, the send state machine, the draft store

**What to build:** everything between the wire and the screen — the chat repository, the infinite query, the socket merge, optimistic send with the C5 failure states, and per-trip draft persistence.

**Blocked by:** 01 — the wire it types against; WS-1 ticket 05 — the `useTopicSubscription` hook.

**Status:** ready-for-agent

- [ ] Repository (typed apiClient, ADR-001 — no raw fetch): `sendMessage`, `listMessages(cursor)`; DTO types matching ticket 01 exactly.
- [ ] Infinite query keyed per trip: `nextCursor` handed straight to react-query (`?? undefined` — the S3.1 lesson lives in one place); newest page first, older pages on scroll-back.
- [ ] Socket merge: `useTopicSubscription('itinerary:{id}:chat')` events merge into the cache **deduplicated by id** — the sender's own broadcast reconciles against its optimistic entry, never double-renders. Unknown event types ignored (ADR-030).
- [ ] Send state machine (pure module, injected clock): optimistic append on release (field clears immediately per C4) → confirmed (id reconciled from the POST response) | failed (C5: held in place, Retry re-attempts the same body in place, Discard removes). **Never auto-retry.**
- [ ] Reconnect signal → invalidate + refetch page 1 (the catch-up convention); the merge dedupe makes the overlap harmless.
- [ ] Draft store: module-scoped, keyed by trip id (the S4.18 lesson — component state dies when expo-router unmounts under a pushed route); survives tab switches; discarded on archive; capped at 2,000 at the store boundary.
- [ ] Jest: the state machine's full graph (optimistic → confirmed / failed → retried / discarded) · merge dedupe (own broadcast, duplicate event, out-of-order arrival) · draft store (persist across mount cycles, archive discard) · cursor handling (null exhaustion — the loop must terminate).
