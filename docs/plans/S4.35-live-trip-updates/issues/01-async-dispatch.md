# 01 — Async dispatch and a real scheduler pool *(the prefactor)*

**What to build:** one traveler's dead connection stops being another traveler's problem. A client that has stopped reading — a phone in a tunnel, which sends no FIN and stays open for minutes — no longer stalls someone else's save, and no longer stalls the heartbeat loop that exists to detect it. This is a **defect fix in shipped code**, not new capability: it is true today with chat live, and it lands first because everything after it fans out across this transport.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `Session.send` enqueues and hands `drain()` to a **bounded executor** instead of running it on the caller's thread. `SEND_QUEUE_LIMIT = 256` and the overflow close are unchanged — the structure was already right, only the thread was wrong.
- [ ] `Heartbeats` gets a real `TaskScheduler` pool. Today no `TaskScheduler` bean and no `spring.task` config exist, so Boot's **single-threaded** default carries both the ping loop and the ticket sweeper, and one stalled socket delays pings for every session behind it — the mechanism that detects dead sessions blocked by dead sessions.
- [ ] The executor's lifecycle is tied to the context: shutdown drains or abandons cleanly. An executor that outlives its context is its own defect.
- [ ] **The slow-consumer IT — the proof this ticket exists for.** A subscribed session opens and then stops reading; another traveler's POST to the same trip completes normally. Uses WS-1's existing **Java** WS client — no Node `ws` client returns (H1 deleted it deliberately; WS-1 ruled against it). **Sabotage-verified: reverting the dispatcher must hang the POST**, and the sabotage must be proven to have landed (grep for it) before the run is believed — a green sabotage run is a suspect invocation before it is a suspect test.
- [ ] **The heartbeat IT.** With one unresponsive session present, every other session still receives its pings on schedule and the unresponsive one is closed as `UNRESPONSIVE`.
- [ ] `synchronized(socket)` contention between a draining broadcast and a ping is gone or provably harmless — a stalled drain must not block the scheduler on the monitor before it even attempts a write.
- [ ] No behaviour change visible to any client. Chat's existing ITs and specs stay green untouched.
