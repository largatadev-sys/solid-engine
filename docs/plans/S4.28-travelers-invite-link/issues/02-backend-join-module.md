# 02 — Backend join module: the link, the teaser, the requests

**What to build:** the invite-link surface whole (spec decisions 4–12): one eternal Join Link per trip, the token-gated anonymous teaser, the token-scoped cover, and the Join Request lifecycle through owner approval — demoable end to end with curl before any UI exists.

**Blocked by:** 01 (the freeze semantics these endpoints must share).

**Status:** ready-for-agent

- [ ] Additive migrations: `join_link` (workspace 1:1, opaque token ≥128-bit URL-safe, unique index, created-at) and `join_request` (workspace, traveler, status `pending → approved | declined | superseded`, created-at, decided-at/-by; at most one `pending` per workspace+traveler, enforced by partial unique index — the enum-spelling-in-SQL trap applies: any predicate naming a status value gets a storage-spelling test).
- [ ] Fetch-or-mint the trip's join link: member-scoped, lazily mints on first read, every later read returns the same token; the response carries the **full share URL** composed from per-environment config (`<web-base>/join/<token>`). Refuses on published/archived trips (the freeze).
- [ ] The **teaser**, by token, answering **anonymously**: title, destination, date range, accepted-member count (C5 — never invited/requested), cover reference. With a bearer token it adds the viewer's state: `member | pending | canRequest`. A valid token on an archived/published trip answers the **dead** state with the teaser still present (canvas 7e: cover dims, teaser stays); an unknown token answers not-found (the client renders the generic dead postcard). ITs assert what the teaser **omits** — no roster names, no plan content, ever.
- [ ] The token-scoped **cover** read: thumbnail variant only, authorized by the token alone (the audience fence correctly refuses this audience — the token is the capability; ADR-032 records the exemption). Unknown token → not-found.
- [ ] Create Join Request, by token: authenticated + **verified email** (the named `EMAIL_NOT_VERIFIED`, same gate as invitation accept) · already-a-member and dead-link answer named refusals · a duplicate while pending creates no second row and answers deterministically.
- [ ] The owner's queue: list pending requests (owner-only, named refusal for members) · **approve** — owner-only, freeze-fenced, creates the membership **in the approving transaction**, marks the request approved, and voids that traveler's pending invitations on the trip (supersede) · **decline** — silent, terminal for the row; the traveler may request again (new row).
- [ ] The other supersede direction: accepting a handle invitation resolves that traveler's open join request on the same trip (`superseded`).
- [ ] Analytics: teaser viewed (anonymous vs authed distinguished), request created, request approved, request declined — the events the parked guest-accounts trigger measures.
- [ ] The join controller's deliberately guard-less routes enter the coverage sweep's exemptions **qualified by controller + reason** — never the bare-name set (the epic-map blind-spot line).
- [ ] Never log the token at issue or redemption beyond its id-safe prefix; never log emails (P3).
- [ ] ITs on the singleton-container base: the full lifecycle (mint → teaser → request → approve → member; decline → re-request), both supersede directions, every named refusal, the freeze interactions, cover authorization.
