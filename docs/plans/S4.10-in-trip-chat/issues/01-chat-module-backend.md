# 01 — The chat module: entity, migration, two additive endpoints, the appended event

**What to build:** a new backend `chat` module (the poll/invitation shape — own table, workspace referenced by ID, every entry through the guard's resolved Membership) carrying spec decisions 1–6 and the wire surface whole.

**Blocked by:** — *(first ticket; owner review gates the story; WS-1 tickets 03/04 must be merged for the event bridge's target to exist)*

**Status:** ready-for-agent

- [ ] Migration (additive): `chat_message` — id UUIDv7 PK, itinerary id, **author traveler id** (decision 2 — never the membership; no cascade from membership delete), body (≤ 2,000, non-blank — DB check + bean validation), at TIMESTAMPTZ; index `(itinerary_id, id DESC)` — the `activity_history` read shape.
- [ ] `POST /v1/itineraries/{id}/chat/messages` — fences in spec order: guard (masked not-found, non-member) → WriteFence (archived: owner 409 / non-owner masked) → published check (**`CHAT_CLOSED`**, named, owner and member alike; no event fires) → validation 4xx. Returns 201 with the message DTO.
- [ ] `GET /v1/itineraries/{id}/chat/messages?cursor=` — standard cursor shape, newest-first, UUIDv7 cursor; items carry `{id, author: {travelerId, handle, displayName}, body, at}` with the author joined from the traveler row at read (the departed-author render).
- [ ] `ChatMessageAppended` domain event (IDs only), published inside the save; WS-1's bridge broadcasts the DTO on `itinerary:{id}:chat` as `chat.message.appended` AFTER_COMMIT — the topic registry's first real row; the topic's subscribe authz is WS-1 ticket 03's, re-asserted here for this channel.
- [ ] Chat writes are workspace acts: no Editing Session, no lease, no `planVersion` bump, no history entry (decision 5).
- [ ] **Never log a body** (P3): message ids and traveler ids only.
- [ ] ITs on `PostgresTestBase` + `RestTestClient`: guard family on both endpoints + the topic · the fence ladder (archive pair · **the publish flip both ways** — publish → `CHAT_CLOSED` + no event; unpublish → send works, history intact) · validation (blank, 2,001 chars) · cursor paging (seeded thread, exhaustion answers null) · departed author (send as t2, remove t2, list shows the handle) · the no-plan-side-effects triple (planVersion, history, leases all unchanged) · AFTER_COMMIT (rolled-back send broadcasts nothing; committed send arrives at a test subscriber, DTO shape asserted).
- [ ] Guard/fence coverage sweeps see the new handlers (the S4.23 lesson — confirm the scanner scans them).
