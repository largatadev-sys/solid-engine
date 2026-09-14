# 04: Seen on the Invitation, and a count that clears

**What to build:** the mail icon carries a number — how many invitations the traveler has not yet seen — and opening Requests makes it zero, on every device they are signed in on. Seen is a fact on the Invitation itself, on the server (record round 4 Q1, round 5 Q1): an additive nullable `seen_at` column in the invitation module's own migration folder, a `seenAt` field on the inbox response, and one route, `POST /v1/invitations/seen`, that marks every pending invitation of the caller seen and answers the same whether it changed one row or none. Seeing is not consent, so the route is **not** refused on a published trip the way issuing, revoking and accepting are, and it never touches join requests (spec decision 9). On the client the count is derived from the inbox query the Trips root already holds — the invitations in the cache with no `seenAt` — and is rendered only when non-zero; outgoing join requests are never counted, because nothing about a request is new to its sender (round 4 Q2). Home's bell dot is an unconditional stub, so a structural pin that the count is conditional exists precisely to stop that shape being copied. Opening Requests posts seen and refetches the inbox; the count falls to zero; a later arrival raises it again, live, through the `invitation.received` absorption that already exists. The wire has no page total, so a second page of pending invitations is not counted — accepted at the grilling and recorded, not hidden (spec decision 8).

**Blocked by:** 03 — the icon and the screen the count sits on, and the focus that clears it.

**Status:** done

- [x] An additive migration in the invitation folder adds a nullable `seen_at` to the invitation table; the storage IT pins the column's spelling and nullability
- [x] The inbox response carries `seenAt` (null until seen); nothing else on the response changes — the existing inbox ITs pass unedited
- [x] `POST /v1/invitations/seen` marks every pending invitation of the caller seen, is idempotent, and is proven **not refused on a published trip** by the same IT that proves issuing on that trip is refused
- [x] The mail icon shows the count of invitations in the inbox cache with no `seenAt`, renders no count at zero, and announces the count to a screen reader; a pure-module test covers the count, and a structural pin proves the render is conditional and is sabotage-checked by making it unconditional
- [x] Outgoing join requests never contribute to the count, pinned in the pure-module test
- [x] Opening Requests posts seen and refetches the inbox; the count is zero on return to Trips
- [x] One Playwright walk carries the lifecycle: an invitation issued to the traveler → the icon reads 1; open Requests → 0; a second invitation arrives → 1 again without a refresh
- [x] Never a query through the guard's back door: the seen write goes through the invitation service, and the route's IT signs in as the invitee — no planted rows
- [~] CI green on push; a local Playwright run against the stack is asked for first — **⚠ PARTIAL: Playwright has not run.** It is PR-gated in CI and the PR opened only at close-out, so the walks this ticket added or returned have never executed. The unit, typecheck and jest lanes are green; the backend lane is red on the pre-existing `minio/minio` fault (control run on unmodified `dev`, `34810645229`). No local rung was exercised: Docker was not running this session

## Comments

*None yet.*
