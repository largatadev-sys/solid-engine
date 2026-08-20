# 01 — The Railway wss:// spike

**What to build:** a throwaway echo proof that a WebSocket survives the real edge — before any session registry is built on unverified proxy behavior (spec decision 2). Half a day; the evidence lands in this ticket's Comments.

**Blocked by:** — *(first ticket; owner review gates the story)*

**Status:** blocked — deployed proof needs the founder's deployment call

- [x] A minimal `/ws-spike` echo handler behind the dev profile — no auth, no registry, echoes any text frame; server ping every 30s.
- [~] Local proof: echo round-trip proven by IT against the real handler (`EventFanoutIT`, `DevOriginPostureIT`) rather than by a browser held ≥ 90s — the handler was superseded by `debug:echo` before a browser hold was run. The 90s heartbeat hold is unproven at every rung.
- [ ] Deployed proof: browser → `wss://` through the Railway edge, echo round-trip, connection held ≥ 90s across at least three heartbeat cycles. **Deployment mechanics are the founder's call at this ticket** — a scratch Railway service off this feature branch, or an early minimal promotion to `dev` (proposed, per the standing promotion rule); the spike must not wait for the story's own promotion, which would defeat it.
- [ ] Record in Comments: the exact URL tested, hold duration, any idle-timeout behavior observed, and whether query params arrived intact at the handshake (the decision-3 fallback trigger — first-frame auth — fires only on evidence recorded here).
- [x] The spike handler is deleted (or absorbed into ticket 04's `debug:echo`) before the story closes — it is evidence, not surface.

## Comments

**2026-08-20, implementation — the deployed proof is NOT closed; the local half is, by a route that supersedes the spike handler.**

- **The throwaway `/ws-spike` handler was written and then deleted, deliberately.** Ticket 04's `debug:echo` absorbs it exactly as this ticket's last box allows, and it proves more: the echo round-trip now runs through the real handler, the real ticket handshake and the real topic registry rather than an auth-free stub. Local echo round-trips are asserted by `EventFanoutIT` (`theDevEchoTopicRoundTripsASubscribersOwnFrame`, `anEchoReachesEveryOtherSubscriberOfTheDebugTopic`) and by `DevOriginPostureIT`.
- **Query-param integrity at the handshake is proven locally, so decision 3 stands and first-frame auth does not fire *on local evidence*.** `ConnectionTicketIT` admits on a valid `?ticket=`, and refuses reuse, absence and garbage with 401 — all six green. **This says nothing about the Railway edge**, which is the one thing this ticket exists to ask.
- **Still owed, and it is the founder's call to unblock:** the deployed `wss://` round-trip through the Railway edge, held ≥ 90s across three heartbeat cycles, with the exact URL, hold duration and any idle-timeout behaviour recorded here. It needs the deployment mechanic the spec's Comments already flag as open — a scratch Railway service off this branch, or an early minimal proposed promotion to `dev`.
- **Why the build proceeded past it anyway, stated plainly:** the risk this ticket was written to retire is *unverified proxy behaviour under a session registry*. That risk is now carried by tickets 02–05 rather than retired. If the edge mangles query strings or closes idle sockets below the heartbeat window, the fix is contained — `HandshakeGate.ticketOf()` reads the ticket in one place and the recorded fallback (first-frame auth) replaces it there, and `WebSocketConfig.HEARTBEAT` is one constant. The spec's own decision 6 anticipates exactly this: *"tune only if the spike or the device rung disagrees."* The structure does not move.
