# S3.1 — Diary: activity-derived posts

**Status:** specced — awaiting owner review *(flips to ready-for-agent at the owner's pass — the S4.19/S4.20 precedent)* · **Epic:** E3 · **Depends on:** S3.3 (shipped — the photo pipeline), S3.4 (specced with this story — the composer's dump source; every other part of this story builds without it), S4.17 (shipped — the Day-by-Day viewer the capture links land on), S4.20 (shipped — the profile tab the My Diary section joins)

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** **ADR-024** (this story's decision record — the postcard re-model; INV-2a and INV-5 amended) · ADR-021/INV-11 (media: ingest, audiences, one-blob-one-row) · ADR-019/020 (lifecycle — the `ongoing` gate reads it, nothing moves it) · ADR-008 (all additive, no waiver) · Artifact 03 (guard) · INV-2's absence rule (satisfied structurally: author-only visibility) · register #13 (re-pointed — see decision 8) · the **08/11 mock set** (design baseline; digest + render archived beside this spec).

## The pull, on the record

The founder opened the session asking for **S4.2** — and the grilling re-cut it. The 08/11 mock set (`diary.txt`, four frames) defines a *capture* flow, not the Highlights surface: per-activity **Add to Diary** links on the workspace's Day-by-Day, a composer (photos from device or the Photo Dump + a caption), a success screen. The founder's own definition — *"a diary is basically a personal post, like a postcard, derived from an activity of an itinerary; the owner of the diary is the traveler"* — contradicted canon's shared-album Diary, and the postcard model won on the record (**ADR-024**): contributor grants die, every traveler owns their own diary per trip. Highlights and diary-publish are explicitly **not covered here** — S4.2 keeps its parked row. Also ruled at this grilling: the mock's day-execution machine (Start/Skip Day, locks, progress bar) is **backlogged whole** — *"this doesn't hold any value yet for the diaries"* — and its Complete Trip button is the existing lifecycle transition, nothing new. Sequencing amended on the record: the diary arc pulls ahead of S4.3.

## Goal

From any activity of a started trip, a traveler mints a postcard — one to five photos (device or the trip's Photo Dump) and a caption — into their own per-trip Diary, visible to them alone, on their profile.

## Locked decisions *(founder, 2026-08-11, in grilling order)*

### 1 · The postcard model *(ADR-024)*

**Diary** = one traveler's collection for one trip. **Diary Entry** = one activity-derived post. Contributor grants are deleted; INV-2a narrows to *one author; only the author writes*. "One itinerary → many diaries" survives as one-per-traveler. **No diary table ships** — the Diary is a projection over entries (the Gallery/Highlight precedent); diary-level state arrives additively at the first story that reads it (S4.2's publish).

### 2 · Activity-anchored, once

At most one entry per traveler per activity — the link flips **Add to Diary → Added ✓**, and tapping Added ✓ opens the existing entry for editing. Edit and delete exist; deleting reverts the link. Free-standing entries and the geotag (old S3.2 shape) park — the activity anchor is what makes a diary a record of the plan as lived.

### 3 · Snapshot at post time

The entry copies the activity's **title, day label, and time of day** when created; the activity link is provenance only, nulled if the activity dies. Later plan edits — rename, move, delete — never rewrite a postcard: what happened doesn't change when someone edits the plan afterward (the ledger/history reasoning, applied to memories). The caption stays editable always.

### 4 · Author-only visibility, everywhere

The own profile gains **My Diary** (entries grouped by trip); the S4.20 co-traveler stub gains nothing; no group feed, no published exposure. INV-2's absence rule is satisfied trivially — nothing a non-author can see exists. Every widening — co-travelers, public, Highlights — waits for the story that owns it (the profiles story / S4.2), where the widening is a deliberate act, not a default.

### 5 · From trip start onward

Creating an entry requires lifecycle state `ongoing` or `completed` — *"once it is started, you can add it to your diary"* — server-enforced with a named refusal; never `draft`/`upcoming` (a diary of a trip that hasn't happened is fiction). Retro-posting on completed trips is deliberate (the mock's own frame is named `retro-success`). **Accepted knowingly:** with day-execution backlogged, an ongoing trip's future-day activities are addable — harmless while diaries are author-only; the day-execution story may tighten it.

### 6 · Photos 1–5, caption optional; the dump is a source, not a destination

A postcard carries at least one photo (it *is* a postcard) and at most five; caption optional. The 6th photo and video join the register-#14 park (S3.3's premium pair, applied per entry). Device-picked photos do **not** enter the trip's Photo Dump. **Selecting a dump photo copies it into the entry** — the entry owns its own photo rows and bytes (one-blob-one-row preserved), so deleting from the dump never reaches a diary; the founder's ruling ("keep it") made structural. The consent question this stores up — another member's dump photo living on in my diary — is recorded as a **must-answer for S4.2** before any diary becomes visible beyond its author.

### 7 · The composer and success screens are the mock, verbatim

Frame 3: activity header (snapshot eyebrow + title), device-photo section, Photo Dump section, caption, info note, one CTA. The info note reads: **"Only you can see your diary. It shows up on your profile."** *(copy founder-approved at the grilling — the export carried no text)*. Frame 4: the success screen ("Activity Added!" · "*<activity title>* is now part of your Diary."), returning to Day-by-Day.

### 8 · What stays out, and where it went

**Highlights + diary publish → S4.2** (parked; register #13 re-points there, carrying the founder's standing answer that the pre-publish surface is the profile). **Day-execution machine → epic-map backlog**, taking the mock's workspace chrome with it — the green TRIP IN PROGRESS badge, day states, progress bar, and the tab row that reads Notes with no Chat/Details (that tab-row question rides with the backlogged line; today's row changes only by Photo Dump going live at S3.4). **Co-traveler/public visibility → the profiles story / S4.2.**

## Mechanics *(the decisions' consequences, settled at the grilling)*

- **One new table** for diary entries: keyed by traveler + itinerary, provenance to the activity that clears on activity deletion (structurally, not by service choreography), snapshot columns for title/day-label/time, caption, timestamps. Uniqueness of (traveler, activity) enforced by a partial unique index where provenance survives — the enum-spelling lesson (S1.1) applies to any predicate it carries.
- **Creation is one transactional act**: the request carries the caption, the activity, the selected dump-photo ids, and the device photos; the server snapshots the activity, copies the dump photos (new rows + copied variants under a diary-entry subject kind), ingests the device photos (INV-11, as-uploaded framing), and refuses the whole act if the total lands outside 1–5.
- **Photo management after creation**: add (device or from-dump), remove — cap 5, floor 1, same named refusals; caption edits by a plain update; entry delete removes rows and bytes (the S3.3 deletion discipline).
- **Audience**: a new per-kind media audience serves diary-entry photos to the entry's author alone — everyone else, co-travelers included, masked to not-found at the media endpoint. The entry endpoints themselves only ever serve *mine* — no cross-traveler read path exists at all.
- **Not plan writes**: no Editing Session, no `planVersion` bump, no history entries. The publish freeze does not bind diary writes (a completed+published trip is exactly the retro case). The **archive fence applies** (writes refused on an archived trip; existing entries stay readable to their author). Guard-first on every endpoint: non-members see not-found.
- **Reads**: my entries for a trip (bounded by activity count — plain list; feeds both the viewer's Added ✓ state and the per-trip stream) · my diary trips (the profile section's grouping — trips having entries, standard cursor shape).
- **Mobile**: the viewer's activity rows gain the trailing link when state ∈ {ongoing, completed} (per-viewer state from the mine query); the composer stages locally and submits once (no editor session involved); My Diary on the profile lists trips, opening a per-trip postcard stream (snapshot header + photos + caption per entry, authenticated media only).

## Wire changes *(all additive — no ADR-008 waiver needed)*

- Create entry (multipart: entry JSON + device photos) · update caption · add photo (device / from-dump) · remove photo · delete entry — all under the guard, lifecycle-gated at create with a named code.
- My entries for a trip · my diary-trips summary (cursor).
- A new diary-entry media subject kind behind the unchanged media endpoint, author-only audience.

## Candidate-capability note *(ADR-009)*

**Diary media richness** — the 6th photo and video per entry: capability acts, footprint-growing, not governance → register #14 (the S3.3 premium pair, per-entry edition).

## Deviations from the mock

- **The workspace chrome around the capture links is not built**: TRIP IN PROGRESS badge, day execution states, progress bar, Notes tab — all ride the backlogged day-execution line. The links land on the *shipped* S4.17 viewer.
- **Undrawn surfaces designed from theme** (ADR-016 tokens, existing patterns), awaiting the founder's next mock pass: the My Diary profile section, the per-trip stream, the edit door behind Added ✓.
- **Fonts**: the mock's Geist/Outfit/Figtree render as the app's token typography — platform reality, the standing rule.
- **Frame 3's unreadable text** (labels exported by role name): reconstructed at the grilling and founder-approved via the rendered artifact; the info-note copy is pinned in decision 7.

## Acceptance criteria

1. On an `ongoing` trip, a member opens Add to Diary from an activity row, posts two device photos + one dump photo + a caption, lands on the success screen, and the row reads Added ✓ — web preview and emulator both, media arriving bearer-authenticated (the S3.3 tell watched in the driver).
2. `draft`/`upcoming`: no links render, and a direct create refuses with the named code (IT — the gate is the server's, not the UI's).
3. A `completed` trip accepts a new entry (the retro ruling, pinned).
4. A second create for the same activity refuses (IT + the index that would catch a race).
5. Snapshot: rename the activity, move it to another day, then delete it — the entry renders unchanged throughout, provenance nulled at the delete (IT).
6. Author-only, the discriminating checks: the mine endpoints return only the caller's entries; a co-member's media GET for a diary photo 404s (IT); the co-traveler profile stub shows no diary anywhere (walk).
7. A dump photo used in an entry survives its deletion from the dump (IT: the entry's photo still serves; the dump row and its bytes are gone).
8. Caps and floor: the 6th photo refuses; a zero-photo create refuses; removing the last photo refuses; caption-only edit works.
9. My Diary renders on the profile grouped by trip, and the per-trip stream shows each postcard's snapshot header, photos, caption; entries remain readable on an archived trip while new writes refuse (fence IT).
10. Deleting an entry reverts the row to Add to Diary and removes photo rows + bytes.
11. The info note reads exactly: "Only you can see your diary. It shows up on your profile."
12. Register-#2 analytics events emit for entry create/edit/delete.

## Testing decisions *(the seams — highest existing ones, none new; confirm at owner review)*

Backend: HTTP-seam ITs on `PostgresTestBase` + `RestTestClient` — the multipart family (S3.3 activity photos), the guard-masking family (members list), the fence family (S1.9), and the **media-audience IT as the load-bearing check** (author reads, co-member 404s — the check with distinguishable outcomes). Snapshot behavior asserted through the API across plan edits (create → rename/move/delete via the plan endpoints → read). Mobile: pure modules for snapshot/anatomy mapping and added-state derivation (Jest; the `landingSlot.ts` precedent — extract the pure seam); component tests per the S4.17 viewer families. Walks: web driver (`--upload` for device photos, dump selection, confirm/alert stubs, API-request list watched) and an emulator walk closing AC 1 end-to-end; both entered through the real affordance, never a direct route (the S4.18 lesson). The four standing rungs; no new seams.

## Out of scope

Highlights, diary publish, any diary-level state (S4.2) · co-traveler or public visibility (profiles story / S4.2) · the day-execution machine and the mock's workspace chrome (backlogged) · free-standing entries, geotag (parked) · video, the 6th photo (register #14) · the Photo Dump surface itself (S3.4) · notifications · any entitlement code (ADR-009).

## Comments

**2026-08-11, at implementation — three things the build surfaced, none of which changes the intent above.**

1. **A published trip's capture links are unreachable, and it is S3.4's gap exactly.** Decision 5 pins retro posting on `completed` trips, and the wire honours it — but the workspace **redirects a published trip to its published view**, which has no Day-by-Day, so on a completed *and published* trip the links have nowhere to render. This is the same shape S3.4 recorded and backlogged for the Photo Dump tab (capability granted on the wire, unreachable in the UI), it has the same fix, and changing the redirect is publish/visibility semantics — a stop rule. **AC 3 was therefore walked on a completed, unpublished trip**, which is the state the ruling actually named; the published case rides the backlogged line with S3.4's.

2. **A removed member keeps a dead row in My Diary — asked, not answered.** `GET /v1/me/diary/trips` is author-scoped with no membership filter (a diary belongs to its traveler, decision 1), while the per-trip stream is guard-first (non-members masked). A traveler removed from a trip therefore still sees that trip listed with its count, and opening it 404s. Shipping the guard-consistent behaviour was the conservative call — no read path was widened — but **which side gives is a founder question for the story that owns visibility (S4.2 / the profiles story):** does losing membership take your own memories off your profile, or should the stream serve an ex-member their own entries? Recorded rather than improvised.

3. **The entry part of the create multipart is a string on the wire, parsed server-side.** The obvious shape — a typed `application/json` part bound straight to `PostDiaryEntryRequest` — would have made this repo's first RN-sent JSON part, which is the S3.3 family (`{uri,name,type}`, `Blob` from `ArrayBuffer`) where RN's FormData does less than its types promise and the failure reads as a network error. The endpoint takes the part as `String` and reads it with the injected `ObjectMapper`, so no client content-type negotiation exists to get wrong, and the IT sends it **untyped** for the same reason — a test posting a part no client can produce would prove nothing.
