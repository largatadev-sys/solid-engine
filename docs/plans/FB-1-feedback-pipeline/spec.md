# FB-1 — Feedback pipeline: the report flow and the worklog relay

Status: ready-for-agent
Date: 2026-08-28
Origin: grilling session 2026-08-28 (`/grill-with-docs`, two rounds; every decision below was
put to the founder and settled in-session). The authoritative cross-repo wire contract is
**worklog's Reports-inbox spec, contract v1.1** (`docs/tickets/reports-inbox/spec.md` in the
worklog repo) — frozen; worklog's IntakeEndpointTest pins it; this story builds to it and
never asks for changes to it.

**Division of labor** *(founder, R1-Q1)*: this story ships the **backend** (accept endpoint,
outbox, relay) and the **client plumbing** (typed repository call, screen capture at flow-open,
draft minting, the label registry). The founder builds the visible UI — the global entry-point
button and the report form — against the contract in this spec.

**Candidate-capability note:** none — filing a feedback report is deliberately never gated
(not footprint-growing, not governance; feedback stays free on every tier, forever).

**Freshness note:** the report flow is submit-only and **deliberately static** — it adds no
surface that renders server state, so neither the live lane nor focus-fresh pull applies; the
thank-you is terminal.

## Problem Statement

Largata is in the hands of real users, but a traveler who hits a bug or has an idea has no way
to tell the team — no feedback form, no crash reporting, nothing. Problems surface only if a
user happens to know a founder personally. Worklog's half of the fix (the Reports inbox and its
intake endpoint) is deployed and waiting; nothing sends to it yet.

## Solution

Every Largata screen — signed-out screens included — carries an entry point into a small
"report a problem / suggest an idea" flow: a problem/idea toggle, a description, up to three
optional screenshots from the gallery, and an instant thank-you. The report automatically
carries which screen the traveler was on when they opened the flow, the platform and app
version, and (when signed in) who they are. Largata's backend accepts the report, stores it in
an outbox, and relays it server-to-server into worklog's intake endpoint with retry — the
traveler never waits on, or learns about, worklog.

## User Stories

1. As a Largata traveler, I want to report a problem from any screen, so that the team learns about bugs without me needing their contact details.
2. As a Largata traveler, I want to suggest an improvement the same way, so that my ideas reach the people who build the app.
3. As a Largata traveler, I want to pick only between "something's wrong" and "I have a suggestion", so that I'm never forced to classify my feedback into categories I don't understand.
4. As a Largata traveler, I want to describe the issue in free text (up to 2000 characters), so that I can say what happened in my own words.
5. As a Largata traveler, I want to attach up to 3 screenshots from my gallery, so that I can show the problem instead of describing it.
6. As a Largata traveler, I want to submit without screenshots, so that a quick suggestion isn't blocked by ceremony.
7. As a Largata traveler, I want an instant thank-you when I submit — even if worklog happens to be down — so that reporting a bug never itself looks buggy.
8. As a Largata traveler, I want an honest "couldn't send — try again" with my form intact when my connection fails, so that my report is never silently lost.
9. As a signed-out visitor, I want to report from the sign-in, verification, onboarding, and join screens, so that "I can't get in" — exactly where such bugs live — is reportable.
10. As a signed-out visitor, I want to submit with no identity at all, so that reporting doesn't demand an account.
11. As a signed-in traveler, I want my name attached automatically, so that I never fill in identity fields the app already knows.
12. As a Largata traveler, I want my invite tokens and trip ids kept out of the report's screen field, so that using the reporter never leaks my data into another system.
13. As a Largata traveler, I want double-tapping send (or retrying after a network error) to file exactly one report, so that my impatience doesn't spam the team.
14. As a founder triaging in worklog, I want each report to name the screen with a human label, so that any founder can read the inbox — not just the one who knows the route names.
15. As a founder triaging in worklog, I want the route segment appended after the label, so that similar-sounding screens stay unambiguous.
16. As a founder triaging in worklog, I want platform and app version on every report, so that "which build was this?" never needs a follow-up nobody can send.
17. As a founder triaging in worklog, I want the reporter's uid to be the traveler UUID, so that I can trace a report straight to its account when investigating.
18. As a founder, I want reporter identity derived only from a verified token, so that no anonymous caller can impersonate a traveler in a permanent, undeletable inbox.
19. As a founder, I want the public accept route rate-limited per-IP and globally capped, so that an abuser cannot flood worklog's permanent inbox through us.
20. As a developer, I want local walks and smoke runs to never write into worklog's dev inbox, so that routine testing deposits no junk in a permanent surface.
21. As a developer, I want accepted reports delivered eventually even while worklog is down, so that an outage costs latency, never data.
22. As a developer, I want delivery replays to be idempotent on both hops, so that retries can never create duplicates.
23. As a developer, I want a worklog 4xx to dead-letter loudly instead of retrying forever, so that a contract bug surfaces the day it happens.
24. As a developer, I want delivered screenshot bytes purged from our outbox, so that our database doesn't hoard megabytes worklog already owns.
25. As a developer, I want the intake secret to live only in environment config, so that no credential ever enters the repo or a log line.
26. As a developer, I want the build to fail when a new screen ships without a label, so that the label registry cannot rot silently.

## Implementation Decisions

Numbered decisions record the grilling round/question that settled each.

1. **One accept endpoint, optional auth** *(R1-Q2 — the stop-rule sign-off for touching the
   security chain was given by the founder in this grilling)*. `POST /v1/reports` is opened as
   `permitAll` in the security configuration — the additive third public route beside health
   and the anonymous join paths. A valid bearer, when present, is used server-side to derive
   `reporter` (traveler UUID + display name at submit); absent or invalid bearer means no
   reporter object — never a synthesized identity (worklog contract). **Reporter is never read
   from the client payload**; any reporter-shaped fields in the payload are ignored.
2. **End-to-end idempotency, client-minted** *(R1-Q3)*. The client mints the `reportId` (UUID)
   when the report draft is created at flow-open. Our accept endpoint is idempotent on it —
   first accept `201`, replay `200`, no second row — and the same UUID is the idempotency key
   worklog honors. Both hops are replay-safe.
3. **Synchronous accept; no device-side outbox** *(R1-Q4)*. The thank-you renders only after
   our backend's 2xx; a network failure shows an honest retry with the form intact (re-submit
   reuses the draft's `reportId`, so a retry is a replay). `submittedAt` is stamped by the
   backend at **first** accept — trusted clock, within a breath of the tap — and a replay never
   restamps it.
4. **Screen context = human label + route segments** *(R1-Q5 c, R2-Q1)*. Format
   `<label> · <segments>` (e.g. `Home feed · (tabs)/(home)`), captured when the report flow
   **opens** (worklog contract: never at submit). The label registry is one client module keyed
   by joined `useSegments()` output; an unmapped route falls back to bare segments — a report
   is never blocked by a missing label. If the pair exceeds the contract's 200 chars, the
   segments truncate, never the label. Segments — not `usePathname()` — because the pathname of
   the join screen contains a live invite token and trip routes contain entity UUIDs; route
   patterns leak nothing.
5. **Label completeness is enforced by a test** *(R2-Q1)*. A Jest test enumerates every route
   file in the app directory and fails when one has no registry entry — a new screen cannot
   ship unnamed. This is what makes hand-written labels safe against silent staleness.
6. **Screenshot sanitization is server-side, reusing the media module's ingest** *(R1-Q6,
   R2-Q3)*. The media module widens its public surface by one service method —
   sanitize-for-display, delegating to the existing ingest: display variant capped at 2048px,
   EXIF stripped by JPEG re-encode, never upscaled. The report module calls that service and
   never reaches the ingest internals (ADR-002: modules by service interface). No Photo entity,
   no object-store write — report screenshots are transport payload, not media.
7. **The 12MB multipart envelope stays** *(R2-Q4)*. Reports ride the existing global multipart
   caps (12MB per file and per request) — parity with the diary's multi-photo posts, no global
   config change. The client renders a 413 as "images too large — try removing one". Per-image
   the ingest's own 10MB/50-megapixel caps apply before sanitization.
8. **Abuse posture: four layers, no CAPTCHA** *(R1-Q7, reaffirmed R1-Q2)*. Container-level
   multipart caps · payload validation (type whitelist, description 1–2000, ≤3 images) ·
   per-IP token bucket (5 reports/hour; IP read from the proxy-appended `X-Forwarded-For`
   value, falling back to the remote address — no global forwarded-header config change) ·
   a global daily cap (100 accepts/day) answering `429`. The global cap is the real defense of
   worklog's permanent inbox; a spoofed forwarded header only rotates per-IP buckets and the
   global cap backstops it.
9. **Store-and-forward outbox in a new `report` backend module** *(R1-Q8)*. New additive
   migration: a report outbox table (report fields, status, attempt bookkeeping) and a
   screenshot table (sanitized bytes as `bytea`, ordinal). Statuses: pending → delivered |
   dead-letter. A scheduled poller (the existing scheduling infrastructure is already enabled)
   runs every minute; per-row exponential backoff capped at 15 minutes; retry forever on
   5xx/network. A worklog 4xx is a permanent verdict: the row goes dead-letter with an error
   log naming the reportId and worklog's validation envelope keys — never the description or
   screenshot content (P3).
10. **Retention: keep the row, purge the bytes** *(R1-Q8)*. After a 2xx from worklog the outbox
    row stays as a delivery audit and its screenshot bytes are deleted — worklog is the system
    of record. Dead-letter rows keep their bytes (they were never delivered).
11. **Relay transport is stated, and the relay owns its retry semantics** *(fact-check + the
    S4.0 transport lesson)*. The worklog relay follows the mail transport precedent: a
    RestClient on an explicitly stated JDK request factory, so no classpath-detected client
    ever adds silent retries under our own retry loop. The relay constructs worklog's multipart
    exactly per contract — the `report` JSON as a **file** part (filename in its
    Content-Disposition; a bare field is rejected), 0–3 `screenshot` parts, the
    `X-Intake-Secret` header compared by worklog. The contract quirk lives in the relay and
    nowhere else; our own accept endpoint takes the JSON as a plain field (the diary
    multi-photo precedent).
12. **Config and the logging-sink default** *(R1-Q9)*. Two properties — intake URL and intake
    secret, environment-variable backed (`LARGATA_REPORTS_INTAKE_URL`,
    `LARGATA_REPORTS_INTAKE_SECRET`), values placed by the founder, deliberately different per
    environment (dev↔dev, prod↔prod), never in the repo (`.env.example` placeholders only).
    Absent config selects a **logging relay** (the invitation-mailer pattern): accept works,
    the outbox row is written, "delivery" logs and marks delivered. Local walks and smoke runs
    therefore never touch worklog. The secret is never logged.
13. **Reporter identity semantics** *(R1-Q10)*. `reporter.uid` = the traveler UUID (the domain
    id every other system surface references — P3), `reporter.name` = display name at submit
    time; a signed-in traveler with no display name sends uid only (worklog's per-field
    optionality). Signed-out → no reporter object at all.
14. **Client plumbing surface** *(R2-Q2 — what the founder's UI calls)*:
    - `newReportDraft()` — called at flow-open; captures the screen string (decision 4) and
      mints the `reportId`; returns the draft.
    - `submitReport(draft, {type, description, screenshots})` — returns a promise; safe to
      re-call on retry (same draft = same reportId = replay).
    The draft state lives module-scoped (the station pattern), not in the pushing screen's
    component state, so it survives the form's own navigation (the S4.18 lesson). `appVersion`
    comes from the Expo config constant, `platform` from the platform API. The API client's
    anonymous allowance is extended so a tokenless upload to the reports path goes through
    (today only the join paths are anonymous-capable).
15. **The mobile → backend contract** *(R2-Q2, signed off)*:

    | | |
    |---|---|
    | Act | `POST /v1/reports` — multipart |
    | Part `report` (JSON) | `{ "reportId": "<client-minted UUID>", "type": "problem"\|"idea", "description": "<1–2000>", "screen": "<optional, ≤200>", "appVersion": "...", "platform": "android"\|"ios"\|"web" }` |
    | Parts `screenshot` × 0–3 | picked originals; backend sanitizes before relay |
    | Auth | Bearer optional; reporter derived from it server-side only |
    | Responses | `201 {reportId}` first accept · `200` replay · `400` validation envelope · `413` oversized · `429` rate-limited |
    | Stamps | `submittedAt` at first accept, never restamped |

16. **Bookkeeping** *(R2-Q5)*. Story id **FB-1** in a new epic-map section "Feedback pipeline"
    (the prefix-series shape of H1/H2/WS-1 — cross-cutting, not part of a launch epic's arc).
    Branch `feature/FB-1-feedback-pipeline`; commits `feat(feedback): FB-1 …`. Worklog's own
    repo calls its half "Story 19"; FB-1 is our side of the same pipeline.

## Testing Decisions

Tests assert external behavior only — status codes, envelope shapes, persisted rows, delivered
bytes — never internals.

- **Primary seam: the backend HTTP integration layer**, in the established `*IT` style
  (failsafe, singleton Postgres container). Accept-endpoint ITs drive real multipart requests
  and assert responses plus outbox state. Prior art: the existing endpoint ITs and the
  dev/prod-profile CORS pair.
- **One new seam: the relay transport interface** — the report module's outbound boundary,
  mirroring the mail transport/mailer precedent (the repo's one established outbound seam
  shape). Poller ITs script 2xx/4xx/5xx/network through a stubbed relay and assert row
  transitions (pending → delivered, bytes purged; 4xx → dead-letter, no further attempts;
  5xx → backoff and retry). The real relay's multipart construction — the file-part quirk
  above all — is asserted against a local stub HTTP server in an IT, and proven for real once
  in the sanctioned live check.
- **Mandatory security coverage** (the new public surface): anonymous accept succeeds;
  reporter-shaped fields in the payload are ignored (signed-in derives from token; signed-out
  stores none); per-IP and global limits answer 429 and persist nothing; oversized and
  malformed payloads (bad type, empty/oversized description, >3 screenshots, non-image part)
  answer 400 and persist nothing; the dev-profile CORS posture covers the new route as it
  covers every `/v1/**` route, and the prod-absence invariant is untouched.
- **Idempotency**: same reportId posted twice → one row, `201` then `200`, `submittedAt`
  unchanged; the relay replaying an already-delivered id is also safe (worklog answers 200).
- **Sanitizer**: through the media module's new public service — output ≤2048px, JPEG, EXIF
  gone, never upscaled. Prior art: the existing media ingest ITs.
- **Migration**: additive new tables only (no data migration, so no migration-stepping IT is
  owed).
- **Mobile (Jest, pure modules)**: the label registry completeness test (enumerates route
  files — the decision-5 guard); label/segments composition and 200-char truncation; draft
  minting (stable reportId across re-submits); screen capture at open, not submit.
- **No automated client e2e** for the form itself (founder-built UI); the story closes with a
  device/preview walk of the plumbing per the repo's verification rungs, plus the **one
  sanctioned live verification**: a single report relayed end-to-end into worklog's dev
  environment with the dev secret (founder places the env values; removed after). Never
  against worklog prod — its reports are permanent.

## Out of Scope

- The visible UI: the global entry-point button and the report form (founder builds both
  against decision 14/15's contract).
- Everything worklog-side (frozen; built and deployed).
- A reporter feedback loop (status back to the traveler, a "my reports" screen).
- A device-side offline queue for reports (R1-Q4 rejected it deliberately).
- CAPTCHA or any auth requirement on the accept route.
- An operator UI for dead letters (log + ops query at this volume).
- Automatic crash reporting or auto-captured screenshots — attachments are user-picked
  gallery images only.
- Entitlement gating of any part of the flow (see the candidate-capability note).

## Further Notes

- **Stop-rule sign-offs on record** (this grilling, 2026-08-28): opening the unauthenticated
  write route in the security chain (R1-Q2); the additive schema for the outbox rides the
  story's normal additive-migration allowance.
- **Worklog dev inbox use is sanctioned once** for the live verification; its reports are
  permanent and have no delete, so every other run — local, CI, smoke — must land in the
  logging relay (decision 12 makes that the default).
- **Bookkeeping when this ships**: epic-map section + BUILD_STATUS row (status + spec link,
  in the last commit on the feature branch); `.env.example` gains the two placeholder keys;
  the founder sets the Railway variables per environment.
- The client's anonymous-path change (decision 14) touches the API client — shared code, so
  the closing broad sweep (full Jest run) is owed before promotion, per the standing rule.
