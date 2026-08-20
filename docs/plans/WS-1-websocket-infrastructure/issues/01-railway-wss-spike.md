# 01 — The Railway wss:// spike

**What to build:** a throwaway echo proof that a WebSocket survives the real edge — before any session registry is built on unverified proxy behavior (spec decision 2). Half a day; the evidence lands in this ticket's Comments.

**Blocked by:** — *(first ticket; owner review gates the story)*

**Status:** ready-for-agent

- [ ] A minimal `/ws-spike` echo handler behind the dev profile — no auth, no registry, echoes any text frame; server ping every 30s.
- [ ] Local proof first: browser → `ws://localhost:8080/ws-spike`, echo round-trip, connection held ≥ 90s.
- [ ] Deployed proof: browser → `wss://` through the Railway edge, echo round-trip, connection held ≥ 90s across at least three heartbeat cycles. **Deployment mechanics are the founder's call at this ticket** — a scratch Railway service off this feature branch, or an early minimal promotion to `dev` (proposed, per the standing promotion rule); the spike must not wait for the story's own promotion, which would defeat it.
- [ ] Record in Comments: the exact URL tested, hold duration, any idle-timeout behavior observed, and whether query params arrived intact at the handshake (the decision-3 fallback trigger — first-frame auth — fires only on evidence recorded here).
- [ ] The spike handler is deleted (or absorbed into ticket 04's `debug:echo`) before the story closes — it is evidence, not surface.
