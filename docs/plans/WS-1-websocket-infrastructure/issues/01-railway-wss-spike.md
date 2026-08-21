# 01 — The Railway wss:// spike

**What to build:** a throwaway echo proof that a WebSocket survives the real edge — before any session registry is built on unverified proxy behavior (spec decision 2). Half a day; the evidence lands in this ticket's Comments.

**Blocked by:** — *(first ticket; owner review gates the story)*

**Status:** done for the proxy question it was written to answer (upgrade · query-param integrity · no idle-timeout, deployed). **AC 1's literal "from a real browser" through the *edge* is NOT closed** — see the composition note in the Comments; the founder decides whether it is worth a preview container built against `api-dev`.

- [x] A minimal `/ws-spike` echo handler behind the dev profile — no auth, no registry, echoes any text frame; server ping every 30s.
- [x] Local proof: superseded by the deployed proof below, which subsumes it — the same echo round-trip through the real handler, the real ticket handshake and the real topic registry, held 95.3s across three heartbeat cycles.
- [~] Deployed proof through the Railway edge: echo round-trip over `wss://`, held **95.3s across three heartbeat cycles**, no idle-timeout, query param intact (evidence below). **Run from Node sending no `Origin`, not from a browser** — the proxy properties are client-agnostic and are proven, but the literal "browser → edge" combination is **not** closed by this ticket or by ticket 06 (which is browser → *localhost*). See the composition note in the Comments.
- [x] Record in Comments: the exact URL tested, hold duration, any idle-timeout behavior observed, and whether query params arrived intact at the handshake (the decision-3 fallback trigger — first-frame auth — fires only on evidence recorded here).
- [x] The spike handler is deleted (or absorbed into ticket 04's `debug:echo`) before the story closes — it is evidence, not surface.

## Comments

**2026-08-20, implementation — the deployed proof is NOT closed; the local half is, by a route that supersedes the spike handler.**

- **The throwaway `/ws-spike` handler was written and then deleted, deliberately.** Ticket 04's `debug:echo` absorbs it exactly as this ticket's last box allows, and it proves more: the echo round-trip now runs through the real handler, the real ticket handshake and the real topic registry rather than an auth-free stub. Local echo round-trips are asserted by `EventFanoutIT` (`theDevEchoTopicRoundTripsASubscribersOwnFrame`, `anEchoReachesEveryOtherSubscriberOfTheDebugTopic`) and by `DevOriginPostureIT`.
- **Query-param integrity at the handshake is proven locally, so decision 3 stands and first-frame auth does not fire *on local evidence*.** `ConnectionTicketIT` admits on a valid `?ticket=`, and refuses reuse, absence and garbage with 401 — all six green. **This says nothing about the Railway edge**, which is the one thing this ticket exists to ask.
- **Still owed, and it is the founder's call to unblock:** the deployed `wss://` round-trip through the Railway edge, held ≥ 90s across three heartbeat cycles, with the exact URL, hold duration and any idle-timeout behaviour recorded here. It needs the deployment mechanic the spec's Comments already flag as open — a scratch Railway service off this branch, or an early minimal proposed promotion to `dev`.
- **Why the build proceeded past it anyway, stated plainly:** the risk this ticket was written to retire is *unverified proxy behaviour under a session registry*. That risk is now carried by tickets 02–05 rather than retired. If the edge mangles query strings or closes idle sockets below the heartbeat window, the fix is contained — `HandshakeGate.ticketOf()` reads the ticket in one place and the recorded fallback (first-frame auth) replaces it there, and `WebSocketConfig.HEARTBEAT` is one constant. The spec's own decision 6 anticipates exactly this: *"tune only if the spike or the device rung disagrees."* The structure does not move.

**2026-08-21, promotion to `dev` — what was run, and what was deliberately not.**

The founder approved an early promotion to `dev` to obtain the deployed proof (the spec's own recorded option, chosen over a scratch Railway service). Ran at the promoted tree: **backend 861 ITs · 210 backend unit · 4026 mobile Jest across 115 suites · `tsc` clean.** **`npm run smoke` was consciously SKIPPED** — a founder call, recorded here rather than left implied, because the standing test-scope rule names it as part of the pre-promotion gate.

The reasoning accepted: WS-1 ships **no traveler-visible surface** and **no consumer subscribes to any topic yet** (`grep useTopicSubscription` outside `src/ws/` returns nothing), so a Playwright run exercises zero lines of the transport. The mobile diff outside the new module is **three lines in `app/_layout.tsx`** — a `useSocketLifecycle` call inside `AuthGate`. Both of its web failure modes were checked and cleared: `AppState` has a real `react-native-web` fork (so not the `Alert.alert` no-op trap), and `disconnect()` on a signed-out app touches a null socket and returns.

**The residual risk, stated so it is not discovered later:** nothing that ran renders `_layout.tsx` in a browser — Jest asserts it as text, `tsc` type-checks it, neither mounts it. `AuthGate` is the component every screen renders through, so a regression there would be broad and would surface **on the dev preview** rather than in CI. That is the accepted trade: the preview is the test rung for this hop.

**2026-08-21, the promotion landed on GitHub; the deploy did not land on Railway — the platform is down (founder).**

`dev` is at `58ec567` on the remote (`git ls-remote` confirms it), so the promotion itself succeeded and nothing needs re-doing. **Railway is not deploying** — a platform-side outage, reported by the founder. The spike therefore stays open on infrastructure, not on anything in this repo. **Resume by re-running the probe below; when it answers 201, run the spike client.** Nothing else needs to change.

**A bad probe was written first, and the lesson is the one this repo keeps paying for.** The initial deploy detector compared `GET /ws` against a nonsense path, reasoning that the new `permitAll` matcher would make them diverge. It cannot: `ConnectionTicketIT.anAbsentTicketIsRefused` proves `/ws` **without a ticket answers 401** because `HandshakeGate` refuses it — so old build and new build both return 401, and **the check's two outcomes were identical**. It ran for 20 minutes and could not have detected the deploy in either direction. Fourth occurrence of the indistinguishable-outcomes trap in this codebase, and the first one authored while quoting the rule against it.

**The probe that actually discriminates is an *authenticated* `POST /v1/ws-ticket`** — unauthenticated probes are worthless here because the security chain rejects before routing, so every path (real or invented) answers an identical `UNAUTHENTICATED` 401. Signed in as pool `t1`:

- **old build → `404 NOT_FOUND`**, byte-identical to `/v1/no-such-route` (the control)
- **new build → `201 CREATED`** with `{ticket, expiresInSeconds}` (`ConnectionTicketController`, `@ResponseStatus(CREATED)`)

Two outcomes, genuinely different, both predicted in advance. That is the resume signal.

**Ready and waiting, needing no further work:** a dependency-free spike client (Node 24's *global* `WebSocket` — spec decision 7's "no new `ws` dependency" holds). It signs in as `t1`, mints a real ticket, connects `wss://`, subscribes to `debug:echo`, holds 95s across three heartbeat cycles, and **echoes again at the end** — because `readyState === OPEN` is precisely the connected-and-dead lie, so only a round-trip proves the pipe. It reports the four things this ticket asks for: exact URL, hold duration, idle-timeout behaviour, and whether `?ticket=` survived the proxy.

**2026-08-21 — DEPLOYED PROOF OBTAINED. The edge behaves; decision 3 stands; the first-frame-auth fallback does NOT fire.**

Railway recovered, `dev` served `58ec567`, and the deploy was confirmed by the discriminating probe above (`POST /v1/ws-ticket` → **201** with a real ticket, against a `/v1/no-such-route` control still answering **404** — two predicted outcomes, genuinely different). Run as pool `t1`.

```
URL tested            : wss://api-dev.largata.com/ws?ticket=<single-use>
Origin sent           : (none — the native-client posture OriginPolicy admits deliberately)
Upgrade accepted      : YES — 101 Switching Protocols through the Railway edge
Query param survived  : YES — the ticket redeemed server-side, so ?ticket= arrived intact
Hold duration         : 95.3s
Heartbeat cycles      : 3 (server pings every 30s)
Still live after hold : YES — an echo round-tripped at the end
Idle-timeout observed : NONE — the edge did not drop an otherwise-silent socket
Close                 : code 1000, client-initiated
```

**The four answers this ticket exists for:**

1. **The upgrade survives the edge.** Railway forwards `Upgrade: websocket` and the connection becomes a real duplex pipe.
2. **Query strings arrive intact at the handshake — the decision-3 question, answered.** The ticket redeemed *server-side*, which is only possible if `?ticket=` reached the handler unmangled. **First-frame auth therefore does not fire**; the spec's recorded fallback stays unused, and the ticket-in-query design ships as designed. Confirmed a second way: **minting one ticket and redeeming it twice through the real edge gives OPEN then REFUSED** — single-use enforcement works end-to-end in production conditions, not just against `PostgresTestBase`.
3. **No proxy idle-timeout inside the heartbeat window.** Held 95.3s with only server pings as traffic; the edge never closed it. The 30s/2-missed-pong defaults from decision 6 need no tuning — *"the numbers move, the structure doesn't"* was the invalidating condition, and it did not trigger.
4. **The socket was alive, not merely `readyState === OPEN`.** The closing echo round-tripped. This distinction is the whole point: a connected-and-dead socket looks exactly like a connected one, so the run asserts a round trip rather than a status field.

**What this proof does NOT cover, stated so it is not assumed:**
- **The browser rung against the EDGE is genuinely unclosed, and the two rungs do not compose.** The deployed proof ran from **Node** (global `WebSocket`, so decision 7 holds) sending **no `Origin`**; ticket 06's two-context spec runs a **real browser** but against `localhost:8081`/`localhost:8080` — **local, not the edge**. Node+edge and browser+local do **not** sum to browser+edge, and an earlier draft of this ticket said they did. What remains untested is the combination: a browser's own upgrade (with `Origin` on the wire) through Railway's proxy. Closing it needs a preview container built against `api-dev` and served from an allowlisted origin — deployed dev refuses `localhost`. **AC 1 is therefore not fully closed**; what is closed is the proxy's behaviour (upgrade, query-param integrity, no idle-timeout), which is what the ticket was written to de-risk.
- **Sustained multi-minute holds** beyond 95s, and behaviour under real network churn (sleep/wake, cell-to-wifi). The device walk at ticket 06 is where those surface.

**The harness bug worth recording, because a passing artifact ended with the word FAILED.** The first run printed `RESULT: PASSED` and then, 59 seconds later, `RESULT: FAILED — global timeout` — a watchdog `setTimeout` that was never cleared on success, firing on a run that had already completed and closed with code 1000. Diagnosed from the timestamps, not assumed. **A result artifact whose last line contradicts its verdict is unusable as evidence** — a later reader cannot tell which line to believe — so the script now clears the watchdog on success and the run above was repeated to produce an unambiguous one. Same family as the checks-with-no-failure-mode rule: evidence has to be *readable* as well as correct.

**2026-08-21, review pass — the spike CLIENT is kept, deliberately, and that is a decision rather than an oversight.** This ticket's last box says the spike *handler* is *"evidence, not surface"* and must go — it did, absorbed into `debug:echo`. The **client** is the opposite case and follows the `drive-preview.js` precedent, which this repo wrote, threw away, and had to write again at S0.6. It lives at **`mobile/scripts/wss-spike.mjs`**, is referenced by nothing, and exists to be re-run by hand against any rung — the resume probe for the next Railway question, the preprod and prod hops, and the browser-through-the-edge rung still open above. **Rewritten at review to stop duplicating `poolApi.js`**: it now signs in through the shared `poolToken(tag)`, so it prints the **tag** and never the pool address (P3 — the address is PII, and the first draft logged it).

Also corrected at review: the evidence banner claimed *"Idle-timeout observed: NONE"* from a ternary that could only ever evaluate one way, because `report()` runs before the close handler and an early close already `fail()`s. **A field with no failure mode inside an evidence artifact is worse than no field** — it reads as a measurement and is a constant. It now states the reasoning it actually has: *"none within the hold — an early close would have failed above."*
