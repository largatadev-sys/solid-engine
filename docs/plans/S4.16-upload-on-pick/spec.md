# S4.16 — The cover and the trip: making creation one act instead of four

**Status:** needs-grilling · **Epic:** E4 · **Depends on:** S3.3 (media pipeline, shipped) · S4.15 (the create flow this changes, shipped)

**This spec is a proposal, not a set of ratified decisions.** It was written at the founder's request on 2026-08-08, immediately after S4.15's cover-upload fixes, to capture the argument while it was fresh. Every "open question" below is genuinely open — the grilling decides them, and only then does this body become immutable per the issue-tracker rule.

> **Context anchor.** S3.3/ADR-021 (the media pipeline: ingest strips and re-encodes, variants generated eagerly, `TRAVELER_AVATAR` centre-squares) · S4.15 (the create flow, and the three fixes that made the *current* upload feel instant without moving when it happens) · ADR-008 (`/v1` additive only) · P3 (never log or commit PII) · ADR-002 (modules reference each other by ID + service interface).

## The pull

The founder, watching S4.15's create flow: *"the photo uploads just when you create a trip. it should upload already when you add it, and discard it when you not save the trip or change."*

S4.15 answered the **symptom** — the flow no longer *feels* like it blocks, because it navigates first, uploads in the background, and renders the traveler's local file while the bytes go up. What it did not change is **when** the upload happens: still at Create Trip, still owned by a trip that must already exist.

**Sharpened the same day, after the fixes shipped** *(founder, 2026-08-08)*: *"this upload on pick is based on how we create the trips. from my observation, we create trips first before uploading the photo. so it doesn't look seamless."* — which names the real complaint. It is **the ordering, not the wait**. S4.15's local preview hid the latency; it did not change the fact that a trip is born coverless and the photo chases it. Any answer here is a model change, and no client-side work can produce one (see the lease finding below).

## What is true today

The cover upload endpoint is `POST /v1/itineraries/{id}/cover` — the trip id is in the path, so **a photo cannot exist before its trip does**. That is not an accident of implementation; it is what makes the ownership question trivial: every stored object has an owner from the instant it is written, and the authorization guard has something to check.

**Creating a trip with a cover costs four sequential round-trips**, and two of them exist *only* because the trip already exists:

```
POST   /v1/itineraries            the trip is created — coverless
POST   /v1/itineraries/{id}/lock  acquire the header lease
POST   /v1/itineraries/{id}/cover the bytes finally move
DELETE /v1/itineraries/{id}/lock  release
```

**The lease is enforced server-side, not merely client politeness** — `ItineraryCoverService.editableHeaderOf` calls `editLease.requireHeldBy(...)` before touching the photo, so dropping the lock calls from the client makes the upload 409, not faster. This is the finding that closes off the cheap fix: **the ordering is the model, and the client cannot change it.** The lease is ADR-014's single-writer guard, correct on the edit screen where two members may collide — and ceremony on a trip that is two seconds old and has exactly one member.

## The three shapes *(the grilling picks one — this is the spec's central choice)*

**The first draft of this spec argued only shape B and presented the decision as binary. That was a hole: shape A answers the founder's actual complaint — the ordering — and kills the three hardest problems outright.**

### A · Born together — the cover travels with the create

`POST /v1/itineraries` accepts the photo alongside the fields (multipart: a JSON part plus an optional image part). **One round-trip. There is no "first"** — the trip and its cover are created in the same act, which is precisely what "we create trips first before uploading the photo" is complaining about.

- **No staging endpoint, no orphans, no TTL sweep, no quota question** — the bytes never exist without an owner, so the three hardest problems in shape B never arise.
- **No lease contact.** Creation is not an edit; nobody can hold a lease on a trip that does not exist. ADR-014 is sidestepped rather than amended, and the lock/unlock ceremony leaves the create path while staying correct on the edit screen.
- **Transactionally feasible** — `ItineraryService.createWithPlan` and `PhotoService.add` are both `@Transactional`, and `createWithPlan` already composes trip creation with day-seeding in one act. *Caveat to settle: the object store is not transactional, so a rollback after the bytes land needs a compensating delete — the new failure mode this shape introduces where B has orphans.*
- **What it does not give:** upload-at-*pick*. Bytes still move at Create Trip. The local preview already covers the perceived wait, so the residual gap is "large photo, slow connection, at submit" — the same gap as today, but with one round-trip instead of four.
- **Additivity:** old JSON-only clients are byte-identical, so this is *plausibly* additive under ADR-008 — **but broadening an endpoint's accepted content types is the founder's ruling to make, not this spec's to assert.**

### B · Staged media — true upload-at-pick

1. **A staging endpoint**, `POST /v1/media`, ingesting bytes owned by the *traveler* rather than by a trip and returning a media id. Ingest runs here, so the thumbnail exists before Create Trip is tapped.
2. **Attach-by-id at create** — `POST /v1/itineraries` gains an optional `coverMediaId`. A wire change; additive, but stated (S4.15 recorded "wire changes: none"; this story cannot).
3. **Discard semantics — the actual hard part.** A traveler who picks a photo then abandons the form, force-quits, or loses the network has uploaded bytes nothing will ever reference. Orphans are the reason this is a story and not a patch, and they bring a TTL sweep (no scheduler exists in this codebase) and a quota (question 3).

This is the only shape that literally satisfies "upload already when you add it". It is also the only one that needs a reclamation story.

### C · Exempt the creator from the lease on a fresh draft

Trims the two lock calls, leaving `create` → `cover`. **Named here in order to be rejected**: it keeps trip-first ordering, so it does not answer the founder's complaint at all, and it amends ADR-014's semantics for a marginal saving. The lease exists to make single-writer true *everywhere*; carving an exception into it to save a round-trip on one screen is the wrong trade.

## Open questions for the grilling

0. **Which shape — A or B?** This is the decision the rest depends on, and the questions below apply almost entirely to B. A answers the founder's stated complaint (the ordering) at a fraction of the cost; B additionally moves the bytes earlier, and pays for it with orphans, a sweep and a quota. **If the complaint is "the trip shouldn't exist before its photo", A is complete.** If it is "the wait at submit should be zero on a slow link", only B does that.

1. **For B: does the visible win justify the orphan problem?** S4.15 already shows the traveler's photo instantly from the local file, and A already removes the ordering. The *only* thing B adds beyond A is that the bytes are already on the server when Create Trip is tapped — which matters on a slow connection with a large photo, and is invisible otherwise. **State that win in terms a traveler would notice**, or take A.
2. **How are orphans reclaimed?** A TTL sweep (delete staged media unreferenced after N hours) is the obvious answer, and it introduces a scheduled job this codebase does not yet have. What is N? What happens to a traveler who fills a long form slowly?
3. **What stops staging from becoming free hosting?** An endpoint that accepts bytes from any authenticated traveler and stores them is a quota question. Per-traveler cap? Rate limit? Today the trip-scoped endpoint bounds this implicitly.
4. **Does "discard when you don't save" mean delete-on-cancel, or only the sweep?** An explicit delete when the traveler backs out of the form is cheap and covers the common case, but it can never be the whole answer — a killed app sends nothing.
5. **Does this generalize?** Activity photos and avatars have the same shape. If staging is built, is it a media-module capability all three use, or a cover-only special case? (ADR-002 favours the former; scope favours the latter.)
6. **Is there a cheaper 80%?** Upload in the background *from the moment of pick* to a trip that does not exist yet is impossible — but **creating the trip as a draft the instant the form opens** would make the current endpoint work unchanged, at the cost of empty drafts from abandoned forms. That trades orphaned *bytes* for orphaned *trips*, which are visible to the traveler and arguably worse. Worth naming so it is rejected deliberately. *(Shape A is the better cheap answer and does not have this cost.)*

7. **For A: what happens when the bytes land and the transaction rolls back?** The object store is not transactional. Either the write is compensated on rollback, or ingest runs before the trip INSERT and the orphan problem returns in miniature. Settle which, because "born together" is only honest if a failed create leaves nothing behind.

8. **Does the four-call sequence matter anywhere else?** The edit screen replaces a cover through the same lock → upload → unlock path, correctly (another member may be editing). Whatever ships must leave that path intact — this story is about *creation*, where the lease is ceremony, not about weakening the lease.

## Provisional acceptance criteria *(shape only — not ratified; question 0 decides which set applies)*

**Common to A and B**

1. A trip created with a cover is **never observable without it** — no window in which the card or the overview shows a placeholder for a trip whose cover the traveler chose.
2. Creating a trip with a cover makes **no lease call** — the create path stops acquiring and releasing a header lock it does not need.
3. The trip-scoped cover endpoint keeps working unchanged for the **edit** screen, lease and all (`/v1` is additive only; question 8).
4. A create that fails leaves nothing behind — no trip, and no bytes in the object store (question 7).

**Additionally, if B is chosen**

5. Picking a cover uploads it immediately; the thumbnail is served from the media endpoint before Create Trip is tapped.
6. Creating a trip with a staged cover attaches it by id, with no second upload.
7. A staged photo that is never attached is gone within the agreed window, proven by a test that **steps the clock** rather than one that waits.
8. Replacing a picked photo before saving does not accumulate — the superseded staging is released.

## Candidate-capability note *(ADR-009)*

**Shape-dependent.** Under **A**, no new candidate — a cover attached at creation grows the same footprint the existing cover endpoint already grows, by the same act, and S3.3's note stands. Under **B**, a **possible candidate**: staged upload grows the traveler's storage footprint *before any trip exists*, which is precisely the "footprint-growing, not existing data, not governance" shape, and if a quota answers question 3 then that quota is the capability. Flag at the grilling; do not improvise a tier check (hard rule).

## Out of scope

Anything about *which* photos a trip has beyond the cover · the activity-photo and avatar flows unless question 5 decides otherwise · changing ingest, variants, or the authenticated-media serving path (S3.3 stands).
