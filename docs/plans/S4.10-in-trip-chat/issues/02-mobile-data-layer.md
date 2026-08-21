# 02 — The mobile data layer: repository, live merge, the send state machine, the draft store

**What to build:** everything between the wire and the screen — the chat repository, the infinite query, the socket merge, optimistic send with the C5 failure states, and per-trip draft persistence.

**Blocked by:** 01 — the wire it types against; WS-1 ticket 05 — the `useTopicSubscription` hook.

**Status:** done

- [x] Repository (typed apiClient, ADR-001 — no raw fetch): `sendMessage`, `listMessages(cursor)`; DTO types matching ticket 01 exactly.
- [x] Infinite query keyed per trip: `nextCursor` handed straight to react-query (`?? undefined` — the S3.1 lesson lives in one place); newest page first, older pages on scroll-back.
- [x] Socket merge: `useTopicSubscription('itinerary:{id}:chat')` events merge into the cache **deduplicated by id** — the sender's own broadcast reconciles against its optimistic entry, never double-renders. Unknown event types ignored (ADR-030).
- [x] Send state machine (pure module, injected clock): optimistic append on release (field clears immediately per C4) → confirmed (id reconciled from the POST response) | failed (C5: held in place, Retry re-attempts the same body in place, Discard removes). **Never auto-retry.**
- [x] Reconnect signal → invalidate + refetch page 1 (the catch-up convention); the merge dedupe makes the overlap harmless.
- [x] Draft store: module-scoped, keyed by trip id (the S4.18 lesson — component state dies when expo-router unmounts under a pushed route); survives tab switches; discarded on archive; capped at 2,000 at the store boundary.
- [x] Jest: the state machine's full graph (optimistic → confirmed / failed → retried / discarded) · merge dedupe (own broadcast, duplicate event, out-of-order arrival) · draft store (persist across mount cycles, archive discard) · cursor handling (null exhaustion — the loop must terminate).

## Comments

**2026-08-21 — the layer between the wire and the screen; 44 Jest tests, no rendering.**

Four pure modules, all Jest-testable without pulling a component in (the `landingSlot.ts` precedent): `chatThread.ts` (grouping, gap timestamps, date separators, the counter, tints, the wire→view mapping and the dedupe merge), `pendingSends.ts` (the C5 state graph), `draftStore.ts` (module-scoped, per trip), and `chatEvents.ts` (the topic name and event type in one place).

**The S3.1 null-cursor lesson is honoured in one place and tested there.** `nextCursorOf` is the only reader of `nextCursor`, it compares with `??`, and `chatThreadCache.test.ts` feeds it the shape the *server* actually sends (`nextCursor: null`, which the `.d.ts` types as `string | undefined` — the type is the lie) to prove it reads as exhausted rather than as a page literally named "null".

**The cache merge was extracted rather than left inline.** `absorbIntoThreadCache` is a pure function both the socket listener and the POST response call, so dedupe-by-id has exactly one definition and is tested directly — including the case that matters most, a message arriving on a page that is not the newest. The sender receiving its own broadcast is not a special case in the code; it is just the dedupe working, which is why ticket 01's IT asserts the broadcast carries the same id the POST returned.

**Draft capping happens at the store boundary, not only in the field.** `writeDraft` clamps, so a draft can never exceed the cap even if some future caller writes to the store directly.
