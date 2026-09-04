# 03 — The Follow Request

**What to build:** the door closes. Following a private profile no longer creates an edge — it creates a **Follow Request** the owner sees in an inbox and approves or declines by the requester; approval creates the edge and opens every fence from ticket 01 to that requester; decline is silent and re-requestable; unfollow cancels. The follow call tells the caller which of the two things happened (spec decisions 4, 5, 12, 13, 17 and the API Contract).

**Blocked by:** 01.

**Status:** done

- [x] **Schema:** a `follow_request` table — id, requester id, target id, status, requested-at, decided-at; foreign keys to traveler; a check that requester ≠ target; **a partial unique index on (requester, target) where status is pending**; the index the inbox read needs (target, requested-at desc). Status storage spelling (`PENDING` / `APPROVED` / `DECLINED` / `CANCELLED`) pinned by a storage IT. Additive migration, next free `V`.
- [x] **`POST /v1/travelers/{travelerId}/follow` answers `200 { "state": "following" | "requested" }`.** Public target: the edge, idempotent, `following` — every side effect the `204` had, asserted. Private target: an existing edge → `following`; otherwise create-or-find the pending request → `requested`, idempotent (a second call finds, never inserts a second row). Unknown or un-onboarded target: the profile-read 404 as today. Self: refused as today. `follow_requested` after commit, on creation only.
- [x] **The widening from `204` to `200` with a body is safe for the shipped client**, which posts `void` and reads nothing — state this in the ticket's comments with the evidence, since it is the one status change in the story.
- [x] **`DELETE /v1/travelers/{travelerId}/follow`** stays `204` and now also **cancels a pending request** (`cancelled`, decided-at stamped); idempotent either way.
- [x] **`viewerRelation: requested`** on the profile read whenever a pending request from the viewer exists; `none` after decline or cancel; `following` after approval.
- [x] **`GET /v1/me/follow-requests?cursor&limit`** — a page of `{ traveler: TravelerCard, requestedAt }`, pending only, newest first, the one pagination shape, clamped like the lists.
- [x] **`POST /v1/me/follow-requests/{travelerId}/approve`** → `204`; the row goes `approved`, the edge is created (idempotent insert); `follow_request_approved` and `follow_created` after commit. **`…/decline`** → `204`; `declined`; `follow_request_declined`; nothing reaches the requester. Both answer **`404 FOLLOW_REQUEST_NOT_FOUND`** when no pending request from that traveler exists — including one already decided.
- [x] **Re-request after decline or cancel creates a new pending row** (the partial index permits it); **a request from someone the target already follows is still a request**.
- [x] **ITs** for every branch above at the HTTP seam, roles named: **t1 = private owner, t4 = requester, t3 = stranger**. Plus the walk that ties this ticket to 01: request → approve → the requester reads the diary tab, the lists and a postcard's bytes that were refused a moment before; decline → still refused. Prior art: the S4.28 join-request ITs (the same request-row grammar) and the S4.37 follow ITs.
