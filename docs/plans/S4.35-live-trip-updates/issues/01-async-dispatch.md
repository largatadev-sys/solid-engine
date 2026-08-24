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

## Comments

**2026-08-25, implementation — STOPPED before writing the fix: the ticket's two blocking claims did not reproduce, and the proof this ticket exists for cannot currently fail.** Recorded with numbers rather than resolved, because the remedy the ticket prescribes may be aimed at a defect this platform does not have — and a green slow-consumer IT written against code that already passes is precisely the check-with-no-failure-mode this repo has been burned by four times.

**What was built to test it.** `DeafWsSocket` (new, `src/test/java/com/largata/support/`) completes the `/ws` upgrade over a raw `Socket` and then never calls `read()`. This matters: the first fixture attempt used `WsTestClient` with the JDK `HttpClient` listener declining to call `request(1)`, which **does not stop TCP reads** — the client keeps draining into its own buffers, so the server never sees backpressure. Any future slow-consumer work needs the raw socket; the JDK client cannot express "stopped reading".

**Measurement 1 — the fan-out does not block the caller.** Broadcasting 8KB frames directly through `EventFanout` to one deaf socket: the session was dropped at **broadcast #278 (~2.1MB in flight)** by the existing `SEND_QUEUE_LIMIT` overflow close, and the **worst single broadcast took 57ms**. The bounded queue absorbs the stall before the socket write ever blocks the caller. Via the REST path the effect is smaller still — a third traveler's chat POST issued while four threads flooded the deaf socket took **191–497ms** across runs, never approaching a stall.

**Measurement 2 — the heartbeat is not blocked by a draining broadcast.** With a deaf socket under continuous flood, `pingEverySession()` was timed 20 times: **worst 0ms**. The `synchronized(socket)` contention the ticket names is real in the source but not observable here, because the drain is not holding the monitor long enough to matter.

**What IS confirmed, and is a code fact rather than a measurement:** there is **no `TaskScheduler` bean and no `spring.task` configuration anywhere** in the tree, so Boot's single-threaded default genuinely carries both `pingEverySession` and `sweepExpiredTickets`. That half of the ticket stands on its own — one stalled task delays the other — independent of whether socket writes block.

**Why the probes may still be wrong, stated so the next person can attack it rather than trust it.** Windows loopback with TCP autotuning at `Normal` grows the receive window aggressively; Railway's real edge, a mobile network, and a genuinely wedged handset are all different. Tomcat's default blocking send timeout (20s) is unconfigured here, so a real stall would surface as a 20-second hang, not a permanent one. The measurements prove *this rung* cannot produce a slow consumer — which is exactly what the spec's decision 9 predicted about load numbers taken against a Testcontainers box, arriving one layer earlier than expected.

**Recommended re-scope, for the owner rather than taken unilaterally** (the spec's decision 8 ruled this work in, so narrowing it is reopening a founder decision): ship the **`TaskScheduler` pool** here, which is confirmed and cheap; move the **async dispatcher** behind a stated trigger, since no rung available to us can prove it fixes anything or catch it regressing. `SlowConsumerIsolationIT` is left in the tree as the harness the decision needs, currently passing against unfixed code — it must NOT be treated as the ticket's proof until it can be made to fail.
