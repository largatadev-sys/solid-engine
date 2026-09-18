# 07: `poll` takes the proofs — the board reads through `InAudience`, every vote and every ask through `Writable`

**What to build:** the poll module's four writes — ask, vote, close, and the fourth act the service fences today — take `Writable`; the board read takes `InAudience` (the type moves, nothing else). Polls are a planning surface that survives publish, so no freeze door is involved: a published trip still votes, an archived one is not found. The owner-*or*-asker rule on close stays in the act as its own predicate — the fence proves state, the act decides role — reading the standing from the proof. No direct call to the old doors remains in `poll`. Behaviour-neutral. Spec decision 9.

**Blocked by:** 03.

**Status:** ready-for-agent

- [ ] Every poll write takes `Writable`; the board read takes `InAudience`; no method in the poll module takes a bare `Membership`
- [ ] The poll module imports neither `WriteFence` nor `AudienceFence`
- [ ] The owner-or-asker refusal on close renders the same code and message as before
- [ ] The poll ITs — including `PollLazyCloseIT` and `PollVoteRaceIT`, which construct memberships directly — pass **unedited** beyond import lines
- [ ] Scoped `poll` ITs and the unit suite green; CI green on push

## Comments

*None yet.*
