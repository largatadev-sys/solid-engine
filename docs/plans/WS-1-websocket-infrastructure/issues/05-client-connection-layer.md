# 05 — The client connection layer

**What to build:** the repository-tier connection manager and the one hook consumers use. UI never touches a socket (ADR-001's posture, extended).

**Blocked by:** 02 — the ticket flow and frame protocol it speaks. *(Buildable against the spec's protocol in parallel; the Playwright proof waits on 04.)*

**Status:** done

- [x] `src/ws/` connection manager: one socket per app session; ticket fetch through the typed apiClient; URL derived at runtime from the already-inlined `EXPO_PUBLIC_API_BASE_URL` (`http→ws`, `https→wss`) — no new `EXPO_PUBLIC_*` variable, no computed env access (the S0.4 inlining trap stays closed).
- [x] Reconnect: exponential backoff with jitter, 1s doubling to a 30s cap; resubscribe-all on recovery; a reconnect signal consumers can hook (the catch-up convention — each consumer refetches its own REST read).
- [x] Lifecycle: `AppState` foreground → reconnect if dead (Android kills background sockets); sign-out tears the connection down; sign-in lazily connects on first subscription.
- [x] `useTopicSubscription(topic, onEvent, onReconnect?)` — the only consumer API. Subscribes on mount / unsubscribes on unmount (mind the S4.18 lesson: expo-router unmounts screens under pushed routes on web — the *connection* outlives any screen; only subscriptions are screen-scoped).
- [x] Unknown event types are silently ignored (ADR-030's tolerance rule) — dispatch by `type`, default no-op.
- [x] Jest on the pure seams (extracted, reanimated-free): frame dispatcher (envelope parse, unknown-type no-op, malformed tolerance) · backoff schedule (deterministic with injected timer values — no `Date.now()` in what a test must steer) · resubscribe bookkeeping (subscribe/unsubscribe/reconnect sequences).

## Comments

**2026-08-20, implementation — one note ticket 06's device walk needs.**

The connection is **lazy by design**: `open()` returns early when the ledger holds no topics, and `reconnectIfDead()` therefore does nothing for a signed-in app that is not currently subscribed to anything. That is this ticket's own contract (*"sign-in lazily connects on first subscription"*) and it is correct — there is nothing to reconnect *for* — but it shapes how AC 10 must be walked: **the walk has to be sitting on a screen that holds a subscription** when it backgrounds and foregrounds the app. Backgrounding from a screen with no live subscription will correctly re-establish nothing, which would read as a failed reconnect rather than as the designed laziness. `debug:echo` is the cheapest way to hold one.
