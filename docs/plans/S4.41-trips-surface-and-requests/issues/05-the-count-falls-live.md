# 05: The count falls live

**What to build:** the number on the mail icon never overstates what waits on the traveler. Arrivals are already live — `invitation.received` is absorbed into the inbox cache over the traveler's own topic from the root layout — but the invitation module fans out exactly one event today, so an invitation revoked by a member, voided by an archive, declined on another device, or seen on another device leaves the count standing until the next refetch. This ticket adds one generic event, `invitations.changed`, fanned out on the traveler's topic after commit — the shape the inbox topic already uses — on those four acts, and one handler in the client's event map that refetches the inbox when it arrives (record round 5; spec decision 11). Expiry is lazy on read and needs no event. The founder's ruling was *"the count should be updated live"*; this is what live costs, and it was put as strike-or-keep at the read-back and kept.

**Blocked by:** 04 — the count and the seen route are two of the four acts that fan out.

**Status:** done

- [x] Revoking an invitation, an archive voiding pending invitations, declining an invitation, and marking invitations seen each fan out `invitations.changed` on the invitee's traveler topic, **after commit** — one ws IT on the existing event-IT pattern proves all four, and proves a rolled-back act fans out nothing
- [x] The client's event map handles `invitations.changed` by refetching the inbox; the event-map test gains the case
- [x] One Playwright walk: with the traveler on Trips reading 1, the inviter revokes → the count falls to 0 with no refresh, no focus change and no pull
- [x] Reconnect still marks the inbox stale as it does today — nothing about the subscription's lifecycle changes, and the existing socket-lifecycle tests pass unedited
- [x] No new topic and no new subscription: the event rides `traveler:<id>`, which the root layout already subscribes to
- [~] CI green on push; a local walk against the stack is asked for first — **⚠ PARTIAL: Playwright has not run.** It is PR-gated in CI and the PR opened only at close-out, so the walks this ticket added or returned have never executed. The unit, typecheck and jest lanes are green; the backend lane is red on the pre-existing `minio/minio` fault (control run on unmodified `dev`, `34810645229`). No local rung was exercised: Docker was not running this session

## Comments

*None yet.*
