# S4.16 — Upload on pick: staged media that exists before the trip does

**Status:** needs-grilling · **Epic:** E4 · **Depends on:** S3.3 (media pipeline, shipped) · S4.15 (the create flow this changes, shipped)

**This spec is a proposal, not a set of ratified decisions.** It was written at the founder's request on 2026-08-08, immediately after S4.15's cover-upload fixes, to capture the argument while it was fresh. Every "open question" below is genuinely open — the grilling decides them, and only then does this body become immutable per the issue-tracker rule.

> **Context anchor.** S3.3/ADR-021 (the media pipeline: ingest strips and re-encodes, variants generated eagerly, `TRAVELER_AVATAR` centre-squares) · S4.15 (the create flow, and the three fixes that made the *current* upload feel instant without moving when it happens) · ADR-008 (`/v1` additive only) · P3 (never log or commit PII) · ADR-002 (modules reference each other by ID + service interface).

## The pull

The founder, watching S4.15's create flow: *"the photo uploads just when you create a trip. it should upload already when you add it, and discard it when you not save the trip or change."*

S4.15 answered the **symptom** — the flow no longer *feels* like it blocks, because it navigates first, uploads in the background, and renders the traveler's local file while the bytes go up. What it did not change is **when** the upload happens: still at Create Trip, still owned by a trip that must already exist.

This story asks whether the underlying model should change.

## What is true today

The cover upload endpoint is `POST /v1/itineraries/{id}/cover` — the trip id is in the path, so **a photo cannot exist before its trip does**. That is not an accident of implementation; it is what makes the ownership question trivial: every stored object has an owner from the instant it is written, and the authorization guard has something to check.

## What the change would require

1. **A staging endpoint.** Something like `POST /v1/media` that ingests bytes owned by the *traveler* rather than by a trip, returning a media id. Ingest (strip, re-encode, variants) runs here, so the thumbnail exists immediately — which is the visible win.
2. **Attach-by-id at create.** `POST /v1/itineraries` gains an optional `coverMediaId`. **This is a wire change** — additive, so ADR-008 permits it, but it must be stated rather than slipped in (S4.15 recorded "wire changes: none"; this story cannot).
3. **Discard semantics — the actual hard part.** A traveler who picks a photo and then abandons the form, force-quits, or loses the network has uploaded bytes nothing will ever reference. These are orphans, and they are the reason this is a story and not a patch.

## Open questions for the grilling

1. **Does the visible win justify the orphan problem?** S4.15 already shows the traveler's photo instantly from the local file. The *only* thing true upload-on-pick adds is that the bytes are already on the server when Create Trip is tapped — which matters on a slow connection with a large photo, and is invisible otherwise. **State the win in terms a traveler would notice**, or don't build it.
2. **How are orphans reclaimed?** A TTL sweep (delete staged media unreferenced after N hours) is the obvious answer, and it introduces a scheduled job this codebase does not yet have. What is N? What happens to a traveler who fills a long form slowly?
3. **What stops staging from becoming free hosting?** An endpoint that accepts bytes from any authenticated traveler and stores them is a quota question. Per-traveler cap? Rate limit? Today the trip-scoped endpoint bounds this implicitly.
4. **Does "discard when you don't save" mean delete-on-cancel, or only the sweep?** An explicit delete when the traveler backs out of the form is cheap and covers the common case, but it can never be the whole answer — a killed app sends nothing.
5. **Does this generalize?** Activity photos and avatars have the same shape. If staging is built, is it a media-module capability all three use, or a cover-only special case? (ADR-002 favours the former; scope favours the latter.)
6. **Is there a cheaper 80%?** Upload in the background *from the moment of pick* to a trip that does not exist yet is impossible — but **creating the trip as a draft the instant the form opens** would make the current endpoint work unchanged, at the cost of empty drafts from abandoned forms. That trades orphaned *bytes* for orphaned *trips*, which are visible to the traveler and arguably worse. Worth naming so it is rejected deliberately.

## Provisional acceptance criteria *(shape only — not ratified)*

1. Picking a cover uploads it immediately; the thumbnail is served from the media endpoint before Create Trip is tapped.
2. Creating a trip with a staged cover attaches it by id, with no second upload.
3. Abandoning the form leaves no trip and no *referenced* media; the staged bytes are unreferenced and reclaimed.
4. A staged photo that is never attached is gone within the agreed window, proven by a test that steps the clock rather than one that waits.
5. Replacing a picked photo before saving does not accumulate — the superseded staging is released.
6. The trip-scoped cover endpoint keeps working unchanged (edit-screen replacement still uses it), because `/v1` is additive only.

## Candidate-capability note *(ADR-009)*

**Possible candidate.** Staged upload is an act that grows the traveler's storage footprint before any trip exists — which is precisely the "footprint-growing, not existing data, not governance" shape. If a quota answers question 3, that quota is the capability. Flag at the grilling; do not improvise a tier check (hard rule).

## Out of scope

Anything about *which* photos a trip has beyond the cover · the activity-photo and avatar flows unless question 5 decides otherwise · changing ingest, variants, or the authenticated-media serving path (S3.3 stands).
