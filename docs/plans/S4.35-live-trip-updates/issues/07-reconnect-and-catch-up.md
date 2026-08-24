# 07 — Reconnect and catch-up

**What to build:** a traveler goes through a tunnel and the app reconciles itself — backoff, reconnect, resubscribe, mark its queries stale, and **fetch on the next focus, not before**. A commuter cycling foreground and background costs nothing until they actually look at something.

**Blocked by:** 04, 06, **and S4.34 ticket 02** *(cross-story: the fetch half is focus revalidation, which does not exist until then)*.

**Status:** ready-for-agent

- [ ] On reconnect the client resubscribes to `traveler:{id}` and calls `invalidateQueries({ refetchType: 'none' })` — **marks stale, does not fetch**. Blunt invalidate-everything was considered and rejected: mobile foreground/background cycling would fire it dozens of times a day.
- [ ] S4.34's focus revalidation performs the fetch when a screen is actually being read. A traveler who foregrounds onto Trips gets one refetch; one who foregrounds onto Home gets none until they navigate.
- [ ] This also **self-heals absorb drift** — if a payload and a list projection ever disagree, the next focus corrects it with no scheduled sweep. Say so in the test's name; it is why absorb was affordable.
- [ ] **The Playwright reconnect spec: kill the connection mid-spec**, assert backoff to reconnect to resubscribe to stale to fetch-on-focus. This box has moved three times — deferred out of WS-1, then out of S4.10's ticket 04, now here, where it finally has a second real subscriber to exercise it. It does not move again.
- [ ] The reconnect decision is a pure, Jest-tested module (the backoff schedule already is — extend, do not duplicate).
- [ ] Assert the negative too: a reconnect while parked on an unfocused-list screen issues **no** request until focus returns.
