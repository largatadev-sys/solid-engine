# 05 — The client connection layer

**What to build:** the repository-tier connection manager and the one hook consumers use. UI never touches a socket (ADR-001's posture, extended).

**Blocked by:** 02 — the ticket flow and frame protocol it speaks. *(Buildable against the spec's protocol in parallel; the Playwright proof waits on 04.)*

**Status:** needs-triage

- [ ] `src/ws/` connection manager: one socket per app session; ticket fetch through the typed apiClient; URL derived at runtime from the already-inlined `EXPO_PUBLIC_API_BASE_URL` (`http→ws`, `https→wss`) — no new `EXPO_PUBLIC_*` variable, no computed env access (the S0.4 inlining trap stays closed).
- [ ] Reconnect: exponential backoff with jitter, 1s doubling to a 30s cap; resubscribe-all on recovery; a reconnect signal consumers can hook (the catch-up convention — each consumer refetches its own REST read).
- [ ] Lifecycle: `AppState` foreground → reconnect if dead (Android kills background sockets); sign-out tears the connection down; sign-in lazily connects on first subscription.
- [ ] `useTopicSubscription(topic, onEvent, onReconnect?)` — the only consumer API. Subscribes on mount / unsubscribes on unmount (mind the S4.18 lesson: expo-router unmounts screens under pushed routes on web — the *connection* outlives any screen; only subscriptions are screen-scoped).
- [ ] Unknown event types are silently ignored (ADR-030's tolerance rule) — dispatch by `type`, default no-op.
- [ ] Jest on the pure seams (extracted, reanimated-free): frame dispatcher (envelope parse, unknown-type no-op, malformed tolerance) · backoff schedule (deterministic with injected timer values — no `Date.now()` in what a test must steer) · resubscribe bookkeeping (subscribe/unsubscribe/reconnect sequences).
