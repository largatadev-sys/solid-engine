# 05 — The invite outranks onboarding

**What to build:** a traveler who arrives with a pending invite sees the trip they were invited to, before being asked anything about themselves. Onboarding is offered after, not before.

This is the ticket that fixes what was actually reported: an invited stranger taps a link, signs in, and must complete a four-step profile before seeing the trip. The token already survives the detour — nothing is lost today — but the thing they came for is behind a wall they did not ask for.

**Blocked by:** 02 — landing on the postcard first is only safe once leaving it leads somewhere the traveler can decline. Without a skip, this ticket just moves the wall one screen later.

**Status:** ready-for-agent

- [ ] A signed-in traveler with an unfinished onboarding and a settled pending join lands on the invite, not on an onboarding step.
- [ ] With no pending join, nothing changes: the unfinished flow is still where they go.
- [ ] Onboarding is not skipped by having an invite — once the join is spent, the unfinished flow is offered as before. Only the order moves.
- [ ] The gate still settles: every destination it produces is somewhere it then leaves the traveler alone. The existing no-loop test covers the new path.
- [ ] The signed-out and unverified branches are untouched — an unverified traveler still goes to the code screen, invite or no invite.
