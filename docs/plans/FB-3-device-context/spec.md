# FB-3 — Device context on reports: os, browser, deviceModel

Status: ready-for-agent
Date: 2026-08-29
Origin: grilling session 2026-08-29 (`/grill-with-docs`, two rounds; every decision below was
put to the founder and settled in-session). The authoritative cross-repo wire contract is
**worklog's Reports-inbox spec, contract v1.2** (`docs/tickets/reports-inbox/spec.md` in the
worklog repo, amended 2026-08-29 — built, deployed to both worklog environments, and
live-checked by the founder the same day). Worklog's IntakeEndpointTest pins it; this story
builds to it and never asks for changes to it. FB-1's header and the epic map still name
**v1.1** as the frozen contract — this story amends both pointers (decision 11).

**Candidate-capability note:** none — same ruling as FB-1: filing a feedback report is
deliberately never gated (not footprint-growing, not governance; feedback stays free on every
tier, forever), and this story adds only metadata to that act.

**Freshness note:** no surface is added or changed that renders server state — the report
flow stays submit-only and **deliberately static**; the thank-you is terminal. Nothing here
takes the live lane or the focus-fresh pull.

## Problem Statement

A founder triaging a problem report in worklog's inbox cannot answer "what was this traveler
running?" — the report says `web` or `android` and an app version, but not which browser,
which OS, or which device. Reporters are unreachable by design (fire-and-forget), so the
follow-up question nobody can send is exactly the question every browser-specific or
device-specific bug needs. Worklog's half is already live: intake contract v1.2 accepts
`context.os`, `context.browser` and `context.deviceModel` and renders them as a combined
Device row on the report detail — but Largata captures none of it, so every report arrives
blank on all three, and **nothing back-fills**: each day before capture ships is a day of
reports that stay blank forever.

## Solution

Every report Largata sends carries the reporter's device context, captured on their device at
report time: the OS name and version in one string ("Windows 11", "Android 14", "iOS 17.5"),
the browser name and version when the reporter is in a browser ("Chrome 128", "Safari 17.5"),
and the device model where the platform exposes one ("Pixel 6", "SM-S918B"). The traveler
sees nothing new — the sheet, the dock and the thank-you are untouched; the fields ride the
existing report payload through the accept endpoint, the outbox and the relay into worklog,
where the triage team reads them as one Device row. Where a value genuinely cannot be known,
the field is omitted — never a placeholder, and never a reason a report fails.

## User Stories

1. As a founder triaging a problem in worklog, I want each web report to name the browser and version, so that "works in Chrome, breaks in Safari" is visible without a follow-up nobody can send.
2. As a founder triaging in worklog, I want each report to name the OS with its version, so that an Android-14-only or Windows-only defect shows its pattern across reports.
3. As a founder triaging in worklog, I want web reports to say "Windows 11" rather than a frozen user-agent's "Windows 10", so that the OS answer is real on the platform most web reporters use.
4. As a founder triaging in worklog, I want native reports to carry the device model, so that "crashes on Pixel 6" is answerable from the inbox alone.
5. As a founder triaging in worklog, I want an iPad Safari report to say "iPadOS" and not "macOS", so that the one browser that actively lies about its OS doesn't mislead a diagnosis.
6. As a founder triaging in worklog, I want a missing value simply omitted from the Device row, so that I read facts, never placeholders that look like facts.
7. As a Largata traveler, I want my report to send whether or not my browser supports modern detection APIs, so that an old or privacy-hardened browser never costs me my report.
8. As a Largata traveler, I want a failure in device detection to cost nothing but the metadata, so that reporting a bug never itself looks buggy.
9. As a Largata traveler on the native app, I want my report to work on the build I already have installed, so that device context doesn't wait on an app update beyond the one that ships it.
10. As a Largata traveler, I want my report to describe my hardware and software, never my device's personal name, so that a report can't leak a name I typed into my phone's settings.
11. As a developer, I want reports queued in the outbox before this story to keep relaying unchanged, so that the migration costs no in-flight report.
12. As a developer, I want a pre-FB-3 client's report (no device fields) accepted forever, so that old installed builds keep reporting.
13. As a developer, I want an over-length device value clamped at our edge rather than refused, so that a pathological user-agent string can never brick the feedback channel for a traveler.
14. As a developer, I want the relay to include the three fields exactly when present, so that worklog's contract tests and ours pin the same payload shape.
15. As a developer, I want the capture logic to be a pure module with fixture user-agents, so that every browser family's answer is pinned in Jest without a browser in the loop.

## Implementation Decisions

Numbered decisions record the grilling round/question that settled each.

1. **Contract v1.2 is the input, verbatim** *(pre-settled by worklog, 2026-08-29)*. Three new
   OPTIONAL fields, flat on the existing `context` object — `os`, `browser`, `deviceModel` —
   each ≤200 chars, opaque strings worklog stores and renders verbatim (no user-agent parsing,
   no vocabulary, no format validation there). Nothing else about the intake contract moved.
   All three ship in this one story because nothing back-fills.
2. **Native capture reads the platform constants already in the installed binary — no new
   native module** *(R1-Q2, confirmed R2-Q1)*. React Native's built-in platform constants
   carry the Android OS release and the device model, so the whole story stays JS-only: the
   existing dev build walks it via Metro, which matters because the workstation's recorded
   Gradle fault (three stories paid for it) blocks producing any new APK, and a new native
   module (the `expo-device` alternative) only exists in a newly built binary. Android:
   `os` = "Android " + release, `deviceModel` = the model constant **verbatim, alone** —
   no manufacturer prefix *(R1-Q3)*. iOS (inactive, ADR-010): `os` comes free from the same
   constants (system name + version → "iOS 17.5"); `deviceModel` is **omitted until the iOS
   activation story chooses its own source** — the contract makes omission valid forever, and
   that story inherits this line knowingly.
3. **`browser` is web-only; native sends none** *(R1 recommendation, accepted)*. The contract
   tolerates a native build sending one, but there is nothing true to send.
4. **Web detection is a hand-rolled pure module: Client Hints first, coarse user-agent
   fallback, omission last** *(R1-Q4)*. Where `navigator.userAgentData` exists (Chromium),
   one high-entropy call supplies `platformVersion` and `model`: Windows platformVersion
   major ≥ 13 reads as "Windows 11", below as "Windows 10"; macOS and Android get their real
   versions. Where it doesn't (Safari, Firefox), the user-agent string decides — and only
   claims what it actually knows: iOS and Android user-agents carry real versions
   ("iOS 17.5", "Android 14"); desktop Windows and macOS user-agents are frozen, so the
   honest coarse answers are "Windows" and "macOS" bare. Browser name + version come from the
   Client-Hints brands list where present, else user-agent tokens (Firefox/, Version/…Safari,
   Chrome/, Edg/, OPR/). No detection library — worklog wants best-effort human-readable
   values, and the module is small and fixture-testable.

   > **Amended 2026-08-29, at implementation, three refinements — each following this
   > decision's own "only claim what you actually know" rule to a case the decision did not
   > enumerate** *(raised by the spec-fidelity review of the FB-3 branch)*:
   > **(a) The Windows read is three-way, not two.** As written above it is binary at major
   > 13. But a platformVersion major of **0** is what Windows 7 / 8.1 report, so the binary
   > rule would mint "Windows 10" for a machine that is neither — a false fact, which is the
   > one outcome this decision exists to prevent. Major 0 (and an unreadable version) now
   > read as bare **"Windows"**. ≥13 → "Windows 11" and everything else → "Windows 10" are
   > unchanged.
   > **(b) A genuine iPad user-agent keeps its version.** Decision 5 covers the *masquerade*,
   > where the version is genuinely unknowable. An iPad that identifies itself (`iPad; CPU OS
   > 17_5`) is not masquerading and its version is right there, so it reads **"iPadOS 17.5"**.
   > Both paths are now pinned by their own fixture.
   > **(c) The version-formatting rule, stated because it is a decision and was implicit.**
   > A version is shortened to its first two dot-segments with a trailing `.0` dropped. That
   > single rule is what turns Chrome's `128.0.6613.120` into **"Chrome 128"**, Android's
   > `14.0.0` into **"Android 14"** and Safari's `17.5` into **"Safari 17.5"** — i.e. exactly
   > the shapes worklog's contract gives as examples, from one rule rather than a per-vendor
   > table.
   >
   > Two smaller consequences of the same rule, recorded so they do not read as accidents:
   > **Chrome OS and Linux are detected** rather than left blank — a Linux Firefox reporter would
   > otherwise arrive with no OS at all, which is the gap this story exists to close. From the
   > user-agent they are bare names; from Client Hints they carry whatever version the platform
   > reports, which on Linux is a **kernel** version ("Linux 6.5") and should be read as such.
   > **A Chromium fork reads as "Chromium", not as itself** — Brave and Vivaldi advertise
   > `Chromium` in their brands list, and the precedence above matches it before reaching the
   > passthrough, so the fork's own name is dropped. That is truthful but coarse; naming the fork
   > would be better triage data, and it is a deliberate non-goal here rather than an oversight —
   > worth revisiting only if a fork ever shows up in the inbox.
5. **The iPad tell is included** *(R2-Q2)*. iPad Safari masquerades as desktop macOS; a Mac
   user-agent plus multi-touch (`maxTouchPoints > 1`) reads as **"iPadOS"** bare (version
   unknowable). A wrong OS answer is worse than a coarse one; this is the one case where the
   user-agent actively lies. *(Amended 2026-08-29 — see decision 4(b): this covers the
   masquerade only; an iPad that names itself keeps its version.)*
6. **Web `deviceModel` is sent exactly when Client Hints yields a non-empty model**
   *(R1-Q5)* — Android Chrome in practice, which includes the founder's own LAN phone rung.
   Everywhere else on web (desktop browsers, iPhone Safari — whose user-agent says only
   "iPhone") the field is omitted. Never a placeholder.
7. **Captured once per session, warmed at sheet-open, read at submit — and it can never
   block or fail a report** *(R1-Q6)*. Device context is static per session; the one async
   piece (the high-entropy Client-Hints call) is kicked off when the feedback sheet opens —
   beside the existing screen capture at flow-open — cached module-scoped (the station
   pattern), and awaited at submit only if still unresolved. Every capture path is wrapped:
   any throw, rejection or absent API degrades to omitted fields, never to a delayed or
   failed submission. The client clamps each value to 200 chars before sending (the worklog
   rule: a 400 on the relay hop is a permanently lost report, so over-length never leaves
   the building).
7a. **Amended 2026-08-30, at the code review — what "a retry replays the same payload" actually
    means.** Ticket 03 states it flatly, and it is true whenever capture has settled, which is
    every ordinary case. It is **not** true in one window: if the first attempt times out waiting
    on capture, it sends no device fields, the capture keeps running, and a retry seconds later
    sends the full trio under the same `reportId`. The two payloads then differ. Nothing is
    inconsistent downstream — the backend is idempotent on first accept, so the stored report
    keeps the *first* attempt's absent fields and the later values are discarded. The cost is one
    report without device context, which is exactly decision 7's posture: metadata never costs a
    report, and never delays one either. Pinned by its own test rather than left as a surprise.
8. **The mobile → backend contract grows three optional fields, additively** — the report
   JSON part gains `os`, `browser`, `deviceModel`, each optional. `/v1` additivity holds:
   nothing renamed, retyped or re-semanticized; a pre-FB-3 client omits all three and is
   accepted forever (ADR-008).
9. **Our edge clamps over-length device values to 200 — deliberately unlike `screen`, which
   400s** *(R1-Q7)*. The asymmetry is on the record so it never reads as an accident:
   `screen` is route-derived, bounded by our own construction, so an over-length one is our
   bug and a loud 400 backstop is right. The device fields quote wild environment input —
   user-agent strings we don't mint — and a 400 posture would brick the entire feedback
   channel for a traveler whose browser produced a pathological string, including their
   ability to report that very bug. Metadata must never cost a report (worklog applied the
   same stance to its own validation). Blank values store as null, like `screen`.
10. **Schema: one additive migration — three nullable columns on the report outbox table**
    *(signed off in-grilling, R1-Q1 — the stop-rule ask for touching existing-table schema)*.
    Pre-existing outbox rows carry null and relay exactly as before. No data migration, so no
    migration-stepping IT is owed.
11. **The relay includes each field exactly when present** — the outbound payload builder
    enumerates context fields explicitly (the silent-drop hazard the worklog hand-off warned
    about), so the three additions are made there by name and pinned by test: present →
    included under the contract's keys; null → omitted, so a pre-FB-3 row's payload is
    byte-identical to today's.
12. **Bookkeeping** *(R1-Q1, R1-Q9)*. Story id **FB-3** in the epic map's Feedback-pipeline
    section; branch `feature/FB-3-device-context`; commits `feat(feedback): FB-3 …`. Worklog
    calls its half Story 21; FB-3 is our side of the same bump. Docs in the same story:
    the glossary (`02-domain-model.md`) gains **Device context** mirroring worklog's term
    (sibling of Screen context); the epic map's FB-1 line and FB-1's spec header get dated
    amendments re-pointing "frozen contract" from v1.1 to v1.2. **No ADR** — additive,
    reversible, unsurprising; the one real trade-off (clamp-vs-400 at the edge) lives in
    decision 9.

## Testing Decisions

Tests assert external behavior only — payload shapes, status codes, persisted rows — never
internals. All seams are FB-1's existing ones; the story adds no new seam.

- **Web capture: a pure module with fixture user-agents (Jest)** — the established
  pure-logic seam (the label-registry/landing-slot precedent). Fixtures pin every family:
  Chromium with Client Hints (Windows 11 vs 10 by platformVersion; Android model present),
  Safari on iPhone (real iOS version, model omitted), Safari on iPad (the masquerade →
  "iPadOS"), Firefox (coarse desktop answers, real Android version), absent/rejecting
  Client-Hints APIs (degrade, never throw), and the 200-char clamp. Native capture: the
  constants read and the "Android " + release composition, with the never-throws guarantee.
- **The repository payload (Jest)** — the existing report-submission suite's seam: the
  report part carries the three fields when capture supplies them and omits them when it
  doesn't; capture failure still submits.
- **Backend accept (failsafe ITs, singleton Postgres)** — the existing report IT suites:
  the three fields persist to the outbox row; absent fields store null; over-length values
  are clamped to 200 and accepted (decision 9's posture, pinned by name); a payload with
  none of the three (the pre-FB-3 client) is accepted unchanged.
- **Relay payload (IT against the local stub server, FB-1's shape)** — a row with all three
  relays them under the contract keys inside `context`; a row with none omits all three and
  the payload matches today's byte-shape (the pre-FB-3-row guarantee); a partial row
  includes exactly what it has.
- **Migration** — additive nullable columns only; covered by the accept/relay ITs above.
- **Full Jest before push** (a new `src/` file ships — the S4.28 guard rule), `tsc`, and CI
  as Tier 2.
- **The sanctioned live check runs against worklog PROD, at the founder's explicit call**
  *(R1-Q8: "straight to prod" — FB-1's precedent, cost accepted again: reports are permanent,
  triaged to `done`, "only me sees it")*. Composition *(R2-Q3)*: **two reports** — one from
  desktop Chrome on the workstation (the full trio via Client Hints: "Windows 11 · Chrome
  1xx") and one from the emulator's native app (Android release + the emulator's model
  string, no browser — proving the native fork and the browser-omitted rendering). The real
  relay is wired to prod only for the minutes those take, then unwired and the logging sink
  verified active again. Both stack executions are gated on the founder's explicit yes at
  run time (the standing execution-approval rule). The check reads worklog's Device row —
  the 201 alone is not the evidence; seeing the row render is.

## Out of Scope

- Any UI change — the sheet, dock, thank-you and failure matrix are untouched; the traveler
  never sees these fields.
- iOS `deviceModel` — omitted until the iOS activation story picks its source (decision 2).
- The user-assigned device name (e.g. a phone's personal name) — deliberately never captured:
  it can carry a real person's name, and P3 keeps PII out of everything durable.
- Further context fields (`locale`, viewport, time zone…) — worklog rejected them at its own
  grilling; a later bump needs evidence, not speculation.
- Any user-agent parsing or vocabulary server-side, ours or worklog's — the strings pass
  through opaque.
- Back-filling reports already in worklog or already in our outbox — impossible by design.
- Crash reporting, automatic diagnostics, or any capture beyond these three strings.

## Further Notes

- **Stop-rule sign-off on record** (this grilling, 2026-08-29): the additive columns on the
  existing outbox table (decision 10). Nothing else touches a stop-rule area: no auth, no
  guard, no /v1 breakage, no visibility semantics.
- **Worklog prod is the sanctioned live-check target, twice ruled** — FB-1's close-out and
  this grilling. Every other run — local walks, smoke, CI — lands in the logging relay
  (FB-1 decision 12 already makes that the default; this story changes nothing there).
- **Why this story is JS-only and immediately walkable**: decision 2. If a future story
  swaps to `expo-device`, it buys a cleaner API at the price of a native build — record the
  trade-off there, not here.
- **Walk result, 2026-08-29 (founder, PC + real phone over the LAN rung) — and the one finding
  worth carrying:** both walks passed. An iPhone filed `iOS 18.7` / `Safari 26.6` with no model,
  and desktop Edge filed **bare `Windows`** / `Edge 151`. That "Windows" is **correct on that
  rung and would be wrong to chase**: `navigator.userAgentData` is a **secure-context-only**
  API, and `http://<LAN-IP>` is not a secure context, so Client Hints is absent and capture
  falls to the coarse user-agent path exactly as decision 4 intends. Measured rather than
  reasoned, same browser minutes apart: `localhost` → `isSecureContext: true`, hints present,
  `platformVersion 19.0.0` (→ "Windows 11"); the LAN IP → `isSecureContext: false`, hints
  absent (→ "Windows"). **Production is HTTPS, so real reports take the Client-Hints path and
  the LAN rung systematically under-reports what they will carry** — which also means this rung
  can never prove decision 4's Windows-11 branch or decision 6's web model. Those two are pinned
  by fixtures and by the live check, never by a phone on the LAN. Recorded as the rung's sixth
  trap in CLAUDE.md, generalised past this story: any secure-context API degrades silently here.
- Every day before this ships is a day of permanently blank device fields on real reports —
  the story is small and its value is front-loaded; it should not queue behind larger work.
