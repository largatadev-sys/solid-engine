# 06 — The harness proof and the story gate

**What to build:** the Playwright evidence that delivery works at the layer that ships, the device walk, and the gate. A connected-and-dead socket looks exactly like a connected one — every assertion here must name what its failure looks like.

**Blocked by:** 04, 05.

**Status:** done for the scope the founder ruled — the two-context echo spec and the full-stack gate. The reconnect spec and the device walk were **deferred to S4.10 on the record** (see Comments).

- [x] Playwright (web project): two browser contexts (pool `t1`/`t2`, verified accounts), both on `debug:echo` through the preview container against the local stack — t1 sends, the spec asserts t2 received **at the socket** (an in-page captured frame log), never at a render. State which tag played which role in the write-up.
- [ ] **DEFERRED to S4.10** — Reconnect spec (kill the connection mid-spec; assert backoff → reconnect → resubscribe → a fresh echo). Deferred because nothing subscribes yet, so the reconnect path has no product consumer to exercise; S4.10's chat tab is its first real one.
- [x] No new `ws` dependency enters the harness (spec decision 7). If a server behavior proves unprovable through the browser, stop and record it here — that finding is the only thing that reopens the decision.
- [ ] **DEFERRED to S4.10** — Device walk (background/foreground re-establishment). Ticket 05's connection is lazy by contract: with no subscription held, `reconnectIfDead()` correctly re-establishes nothing, so the walk would test the harness rather than the product.
- [x] Gate (test-scope rule: the full stack once, here): full mobile suite · full backend ITs (`mvn -o test-compile failsafe:integration-test`, counts read from the `Tests run:` summary, never the exit code) · `npm run smoke` whole.
- [x] BUILD_STATUS row flips in the last commit on this branch; promotion proposed, never executed.

## Comments

**2026-08-21 — the reduced scope the founder ruled, run in full; two boxes deferred to S4.10 on the record.**

The founder's call: *"do the two-context echo spec — it's the one that proves the client layer works at all before S4.10 depends on it"* and *"do the full-stack gate"*, leaving the reconnect spec and the device walk. Both deferrals are reasoned, not skipped: **nothing subscribes to a topic yet** (`grep useTopicSubscription` outside `src/ws/` returns nothing), so the reconnect path has no product consumer, and ticket 05's connection is **lazy by contract** — with no subscription held, `reconnectIfDead()` correctly re-establishes nothing, which would read as a failed walk against a correct product. S4.10's chat tab is the first real consumer of both.

**The echo spec (`e2e/web/socket-echo.spec.ts`), and why it was the box worth keeping.** Before it, `mobile/src/ws/connection.ts` had **never opened a real socket outside Jest**, where the `WebSocket` itself is mocked — and S4.10 builds chat directly on it. The precedent is S1.3, which shipped an entire dead grey-out shell to the web with every unit test green. Three cases, two independent browser contexts (**`t1` sends, `t2` listens**), through the preview container against the local stack: t1→t2 delivery · the sender receives its own broadcast · an unknown action answers an error frame **without killing the connection** (ADR-030's tolerance rule). Every assertion reads the **in-page captured frame log, never a render**, and every wait is bounded so the failure mode is an absent frame rather than a hang. No new `ws` dependency — browsers ship `WebSocket`.

This rung also covers what the deployed spike structurally could not: the browser handshake puts **`Origin: http://localhost:8081` on the wire**, where the Node spike sent none. Both the origin-allowlist path and the header-less native path are now exercised.

**Sabotage-verified, because a green tick is not evidence.** Removed the `debug:echo` broadcast, rebuilt the backend, re-ran: **3 failed**. Restored, rebuilt, re-ran: **3 passed**. Full pass → fail → pass cycle, with `git status` confirming zero residue. Worth doing rather than asserting: earlier in this same session the deploy detector was a check with no failure mode, so this one had to be proven to fail for the right reason.

**The gate, run once at this tree:**

| Rung | Result |
|---|---|
| Backend ITs | **861 passed, 0 failed** (counts from the `Tests run:` summary, never the exit code) |
| Backend unit | 210 passed |
| Mobile Jest | **4026 passed, 115 suites** |
| `npm run smoke` | **605 passed, 2 skipped, 0 failed** (9.5m, both projects, one exit code) |
| `tsc --noEmit` | clean |

The **2 skips are pre-existing `test.fixme`s in `trip-details.spec.ts`** from S4.25 (date set/clear), untouched here — checked rather than assumed, because a skip can hide a spec that never ran.

**The deferred risk from the earlier smoke skip is now discharged.** `app/_layout.tsx` gained three lines wiring `useSocketLifecycle` into `AuthGate` — the component every screen renders through — and nothing below this rung mounts that file (Jest asserts it as text, `tsc` type-checks it). The whole web suite rendering green through it is the evidence that was owed.
