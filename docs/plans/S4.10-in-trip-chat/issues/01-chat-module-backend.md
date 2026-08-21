# 01 — The chat module: entity, migration, two additive endpoints, the appended event

**What to build:** a new backend `chat` module (the poll/invitation shape — own table, workspace referenced by ID, every entry through the guard's resolved Membership) carrying spec decisions 1–6 and the wire surface whole.

**Blocked by:** — *(first ticket; owner review gates the story; WS-1 tickets 03/04 must be merged for the event bridge's target to exist)*

**Status:** done

- [x] Migration (additive): `chat_message` — id UUIDv7 PK, itinerary id, **author traveler id** (decision 2 — never the membership; no cascade from membership delete), body (≤ 2,000, non-blank — DB check + bean validation), at TIMESTAMPTZ; index `(itinerary_id, id DESC)` — the `activity_history` read shape.
- [x] `POST /v1/itineraries/{id}/chat/messages` — fences in spec order: guard (masked not-found, non-member) → WriteFence (archived: owner 409 / non-owner masked) → published check (**`CHAT_CLOSED`**, named, owner and member alike; no event fires) → validation 4xx. Returns 201 with the message DTO.
- [x] `GET /v1/itineraries/{id}/chat/messages?cursor=` — standard cursor shape, newest-first, UUIDv7 cursor; items carry `{id, author: {travelerId, handle, displayName}, body, at}` with the author joined from the traveler row at read (the departed-author render).
- [x] `ChatMessageAppended` domain event (IDs only), published inside the save; WS-1's bridge broadcasts the DTO on `itinerary:{id}:chat` as `chat.message.appended` AFTER_COMMIT — the topic registry's first real row; the topic's subscribe authz is WS-1 ticket 03's, re-asserted here for this channel.
- [x] Chat writes are workspace acts: no Editing Session, no lease, no `planVersion` bump, no history entry (decision 5).
- [x] **Never log a body** (P3): message ids and traveler ids only.
- [x] ITs on `PostgresTestBase` + `RestTestClient`: guard family on both endpoints + the topic · the fence ladder (archive pair · **the publish flip both ways** — publish → `CHAT_CLOSED` + no event; unpublish → send works, history intact) · validation (blank, 2,001 chars) · cursor paging (seeded thread, exhaustion answers null) · departed author (send as t2, remove t2, list shows the handle) · the no-plan-side-effects triple (planVersion, history, leases all unchanged) · AFTER_COMMIT (rolled-back send broadcasts nothing; committed send arrives at a test subscriber, DTO shape asserted).
- [x] Guard/fence coverage sweeps see the new handlers (the S4.23 lesson — confirm the scanner scans them).

## Comments

**2026-08-21 — the module landed; 18 ITs across two classes, and the coverage sweep was sabotage-verified rather than trusted.**

`ChatContractIT` (13) walks the wire: the shared thread, newest-first order, the author joined at read, the departed author, the non-member's masked 404 on **both** doors, the publish flip both ways, reads staying open while published (the unpublish return path), the archive pair, validation at the boundary and *at* the cap, cursor paging to exhaustion, and the no-side-effects triple. `ChatDeliveryIT` (5) walks the socket: the envelope shape, the sender receiving its own broadcast (which is what forces the client's dedupe-by-id), a `CHAT_CLOSED` write broadcasting nothing, cross-trip isolation, and the topic's masked refusal for a non-member.

**Two fence details worth recording.** `WriteFence.requireEditable` already implements this exact ladder, but it throws `ITINERARY_PUBLISHED` where decision 3 names **`CHAT_CLOSED`** — so the service calls `requireWritable` and then tests `PublicationState` itself. Reusing `requireEditable` would have compiled, passed a careless test, and shipped the wrong refusal code to the client's fence handling.

**The coverage sweep was verified by sabotage, and the first sabotage was invalid.** `AudienceFenceCoverageTest` gains `ChatController.java#thread`. Renaming the call to `requireInAudience_SABOTAGE` **passed** — the scan tests for the literal substring, which the longer name still contains, so the probe had no failure mode. Removing the fence outright failed the sweep naming `ChatController.java#thread` exactly, which is the real signal. Recorded because the invalid sabotage is the more instructive half: a probe that cannot fail proves nothing, and this one looked conclusive.

**Fixture trap for the next story:** publishing needs the trip **completed**, and completing needs it **started** — `/start` → `/complete` → `/publish`. A bare `/publish` answers 409, which reads as a chat fence firing when it is the lifecycle ladder refusing.
