# S4.0 — Auth & onboarding retrofit · spec

**Status:** intent locked 2026-07-30 — grilling session (grill-with-docs), founder-confirmed. Immutable point-in-time intent (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** The 07/30 auth+onboarding wireframes (this story's design input — welcome-landing · sign-up · email-verification · create-profile · what-brings-you · travel-preferences · travel-setup · onboarding-complete, in both wireframe and styled form) · 02 (Traveler; the new **Handle** glossary term) · **ADR-015** (handle) · **ADR-016** (palette) · ADR-006 (Firebase owns credentials, backend is a resource server — **unchanged**: the `email_verified` claim stays the gate) · ADR-008 (additive /v1) · S0.2 (auth end-to-end; display name non-unique) · S1.2 (the verified-email invite gate; **ticket 09 — the display-name step — was cut to this story**; the invite-preservation ruling) · S0.5/S0.6 (the Google button investment: official GIS button, tri-state `authCapabilities`) · the three epic-map lines discharged here (full onboarding flow · sign-up/onboarding UX reconciliation · the cold-visit 401) · register #2 (analytics call sites) · ADR-009 amendment (the candidate-capability note, §14).

## The pull, on the record

This story merges two backlog lines. The **sign-up/onboarding UX reconciliation** (raised at S1.2's grilling) had trigger *"the story after S1.2"* — which lapsed through S1.3–S1.9; S4.0 runs that reconciliation against the newer 07/30 wireframes. The **full onboarding flow** had trigger *pre-alpha*; the founder pulled it forward deliberately at this grilling. Three of the session's calls reverse recorded rulings (full flow now · "Earn" back in as signal · OTP over link) and two close registered decisions ahead of their pre-S4.3 pins (handles — ADR-015 · palette — ADR-016). All are recorded reversals, not drift.

**The trade taken, named honestly:** every reversal trades *alpha-loop friction* for *design fidelity* — every new account, invitees included, now pays six screens and a code entry before touching the product. If alpha testers stall at onboarding, this record is where to look first.

## Goal

A traveler who installs Largata meets the product the wireframes describe: a branded welcome, a real sign-up with verified email, a profile that makes them identifiable (@handle, display name, avatar), and preference questions that set up the social surface E4 is about to build — on web and Android identically, in the palette the whole app now wears. The auth surface the walking skeleton stubbed becomes the designed front door.

## Locked decisions *(grilling 2026-07-30, in decision order)*

### 1 · The full flow ships — blocking, for everyone, invitees included

Supersedes the 2026-07-17 *"onboarding stays minimal"* ruling on the record. The flow: **welcome → sign-up (or sign-in) → verify (email path only) → profile → goals → interests → travel setup → complete**. No skip affordances; invitees walk it whole (founder call, taken against the fast-path recommendation) — the S1.2 preservation ruling still binds, so **the pending invitation survives all six screens** and the completion CTA lands an invitee where the invitation card is visible.

**Step indicator, resolving the wireframe's inconsistency** (three consecutive screens all read "Step 3 of 4"): four counted steps — profile **1** → goals **2** → interests **3** → travel setup **4** — with verification before the count and completion outside it.

### 2 · Verification is a backend-issued 6-digit code, built for real

Founder call, taken with the costs stated. The shipped Firebase `sendEmailVerification()` link is **retired for sign-up**; in its place:

- The signed-in-but-unverified client calls **send** → the backend issues a 6-digit code (single active code per traveler, ~10-minute expiry, attempt cap, resend cooldown — exact values at the ticket) and mails it via **Resend**.
- The client submits the code to **confirm** → the backend verifies and flips `email_verified` **via the Firebase Admin SDK** → the client refreshes its token → the claim is live.
- Codes are **stored hashed and never logged** (P3 — a code is a short-lived credential). One exception, inherited from S1.2's mailer pattern: when no Resend key is configured the **logging sink** stands in and the mail (code included) goes to the backend log — acceptable because a keyless rung has no real mail and only test identities; the real mailer never logs.
- **What this pulls forward:** the transactional-email infrastructure (Resend key per rung, sending-domain DNS on `largata.com`) and the Admin SDK as a new backend dependency (a service-account credential — a secret; env-var only, never committed). This is auth/token stop-rule territory; the founder deciding it at this grilling **is** the ask.
- **What it does not touch:** the invite gate (reads the claim, not the mechanism) · password reset (stays Firebase-sent; mixed senders accepted) · Google sign-ins (pre-verified, skip the step entirely).
- **What it fixes for free:** the recorded *unreachable verify-waiting screen* — verification is now sign-up's own inline step, so the inbox-reachable dead end ceases to exist. The old `verify-email` screen is replaced (client code carries no additivity duty).

**Rejected:** keeping the link with a restyled screen (recommended, declined) · code-boxes UI over a link mechanism (a screen that lies — ruled out on the record).

### 3 · Google stays, on both auth screens; Apple stays out

The wireframes omit Google; the flow gains it — the official button renders on **sign-up and sign-in** ("or continue with Google"), reusing the S0.5/S0.6 tri-state and GIS machinery unchanged. The Google path skips verification and lands in the profile step with **display name and photo prefilled**. Apple remains at the iOS activation (ADR-010).

### 4 · Handles ship — ADR-015, decided ahead of its pin

3–20 chars `a–z 0–9 _`, stored lowercase, globally unique case-insensitively, **required** at the profile step with a collision-free prefilled suggestion (derived from the Google/email name), freely changeable, released immediately, reserved-word blocklist. **The id stays the identifier everywhere** — routes, FKs, any future URL; that one rule is what makes free change safe. An **availability check** is its own additive endpoint (live feedback while typing). Because "freely changeable" needs a surface, the **me screen gains an Edit profile entry reusing the profile step** — modest, cuttable at ticket review if the owner prefers.

### 5 · "Earn from my itineraries" ships as signal-gathering only

Narrows the 2026-07-17 cut rather than voiding it: the goal option renders, its selection is **stored and analytics-measured** (that is what makes it signal rather than decoration), and it carries **no product promise** — creator monetization remains outside the roadmap. Goals are: Discover trips · Plan a trip · Plan with friends · Share an itinerary · Earn from my itineraries.

### 6 · Goals, interests, and bio ship knowingly reader-less

The fourth instance of the mechanism-before-reader pattern (S1.7/S1.9/S1.8's shape, named by the founder 2026-07-29) — **taken deliberately, with eyes open**. Nothing commits to reading them: S4.3's spec decides freely whether discovery consumes interests; goals steer nothing; bio's reader is E4's profile surface. The completion screen's summary **claims only true things** — "Discovery mode active" is reworded (final copy at the ticket); no line asserts behavior that doesn't exist.

### 7 · Travel setup: locale-derived defaults, PH/PHP fallback

Country prefills from the device region (expo-localization; browser locale on web), currency derives from the country, and an unreadable locale falls back to **Philippines/PHP** (the home market). Country comes from a static ISO list; **home city stays free text** (Place Search is a reserved future term); **preferred currency means one thing**: the default for E5 expense logging — there is no FX anywhere in the roadmap, and the spec says so to stop the field meaning more.

### 8 · Photo: Google import + initials now; upload activates at S3.3

The avatar circle ships — Google sign-ups get their Google photo, email sign-ups an initials avatar. The **camera badge and Upload Photo affordance are absent until S3.3 lands** (then they appear, additively). No dead clicks, no "coming soon" on a first impression (the S1.3 lesson as law).

### 9 · No ToS line until the documents exist

The sign-up screen ships without the wireframe's consent sentence; the ToS/Privacy backlog line keeps its pre-alpha trigger, and the line and its links land together when the documents do.

### 10 · The palette is the brand — ADR-016, decided ahead of its pin

Terracotta `#D96C4A` · navy `#1B263B` · cream `#FAF9F6` · secondary `#5C6470` · border `#E2E4E8` · white surfaces · **Inter** as the type family (loaded as an app font, native and web). A **values-only swap** in the theme tokens — every existing screen re-skins with zero structural change; no screen hardcodes a value. Supersedes the 07/18 mock's orange as brand evidence.

### 11 · Completion is a client-routed gate; the backend never enforces it

The app routes any signed-in traveler with an incomplete profile (no handle) into onboarding; **no /v1 endpoint refuses an incomplete profile** — backend enforcement would add a failure mode to shipped endpoints (ADR-008 breach) and break old installed clients. **Existing accounts — founders included — walk the flow once on next sign-in**, which also populates their handles before S4.3 renders them. Completeness is derivable (handle present + onboarding marker); the exact marker shape is the ticket's.

### 12 · S4.0 goes first in the E4 pull

**S4.0 → S4.1 → S3.3 → S4.3 → S4.4–S4.8.** Profiles, handles, and the palette are the social surface's foundation, and this story blocks nothing behind it.

### 13 · The cold-visit 401 rides along

The backlog line said *fix it when next in this code* — this story is next in that code. The trips query defers until auth resolves (`enabled:` on the restoring state); the unauthenticated `GET /v1/itineraries` on cold visit disappears.

### 14 · Candidate-capability note *(ADR-009's standing duty)*

**None.** Considered and rejected: `verification.send` consumes a meterable resource (an email) but is a security-required act that can never be gated behind a tier; profile writes and handle changes update the traveler's own row — not footprint-growing; onboarding completion is identity, not capability. Recorded as a considered "no" rather than a gap.

## Backend scope

One additive migration: Traveler gains `handle` (nullable, **unique case-insensitively** — the constraint's semantics pinned by a test, the V4 lesson) plus profile columns (avatar URL, bio, country, preferred currency, home city, goals, interests, onboarding-completed marker; array/storage shape at the ticket) — all nullable, so every existing row stays legal and no backfill exists to test. A `verification_code` table (traveler id, code hash, expiry, attempt count) — ephemeral state; fresh-DB wipes are correct behavior.

New additive endpoints: verification **send** + **confirm** · profile read/update on `/v1/me` (GET gains fields; a write endpoint arrives) · handle **availability**. The Admin SDK enters behind a small seam (one class owns "flip `email_verified` for uid") so the provider dependency stays in one place, consistent with ADR-006's exit posture. The Resend verification mailer lands beside the existing config-gated invitation mailer, same binding rule (key present → real mail; absent → logging sink). Analytics events per register #2: sign-up, verification confirmed, onboarding completed, goal/interest selections (the "Earn" signal lives here).

## Mobile scope

The single `sign-in` screen splits into **welcome-landing / sign-up / sign-in**; the OTP screen replaces `verify-email`; **create-profile / goals / interests / travel-setup / complete** are new, step-indexed per decision 1. The routing gate (decision 11) and the cold-visit fix (decision 13) land in the auth-gate/query layer. All data access through the repository/typed-`apiClient` layer (ADR-001); dialogs platform-forked (the `Alert.alert` web-no-op gotcha); GIS button on web, official native button on Android — S0.6's machinery untouched. The palette swap is token values + the Inter font assets; screens keep consuming tokens only. Web preview parity throughout (the standing principle) — the whole flow must run in the preview container.

## Console & infra work *(the S0.6 lesson: name it before it burns an afternoon)*

- **Resend:** account · sending-domain DNS records on `largata.com` (SPF/DKIM — propagation is not instant; do this first) · API key per rung in the platform env-var UI (deployed `dev` now; preprod/prod when those rungs exist). Keys never enter the repo.
- **Firebase Admin SDK:** a service-account credential for `largata-dev` (and `largata-prod` at its rung), env-var only. Identify the project by **number** (`309534715609`), per the S0.6 phantom-project trap.

## Harness impact

The verified pool survives untouched (pool accounts are already verified in Firebase, which outlives every DB reset). For **new** accounts the one-time human click becomes a one-time code entry; on keyless local rungs the code is read from the backend log (decision 2's sink). `test-pool.js` / `seed-trip.js` gain a **profile pre-completion call** after provisioning so device walks aren't taxed with six screens per pool account on every fresh-DB rebuild. `drive-preview.js` extends to walk the new flow.

## Acceptance criteria

| # | Criterion | Closed by |
|---|---|---|
| 1 | Email sign-up: code issued and mailed (Resend, or the logging sink keylessly); correct code → `email_verified` true after token refresh → profile step | IT + device |
| 2 | Wrong code → typed error · attempt cap → refusal · expired → refusal · resend inside cooldown → refusal; codes hashed at rest, absent from logs when the real mailer runs | IT |
| 3 | Google path: no verification step; display name + photo prefilled; same Traveler provisioning (`Traveler provisioned` in the backend log, traveler count 0 → 1) | Device |
| 4 | Handle: availability endpoint truthful · duplicate (case-insensitive) refused · reserved word refused · format enforced · change releases the old handle, immediately claimable by another account | IT |
| 5 | The uniqueness constraint's semantics are pinned — sabotage-verified (the test fails when the constraint's meaning moves) | IT (storage) |
| 6 | **The negative control:** an un-onboarded traveler exercises the core /v1 surface successfully — no endpoint anywhere refuses on incompleteness | IT |
| 7 | Client gate: a fresh account walks all screens in order; a completed account is never re-prompted; an existing NULL-handle account is routed exactly once | Device |
| 8 | Invitee: pending invitation survives the full flow; completion lands where the card is visible; accept succeeds after onboarding *(pool: state which tag played which role)* | IT + device |
| 9 | Locale defaults: device locale → country/currency; unreadable locale → Philippines/PHP | Unit + device |
| 10 | Goals/interests stored; "Earn" selection emits its analytics event; the completion summary contains no untrue claim | IT + copy check |
| 11 | Cold visit fires **no** unauthenticated `GET /v1/itineraries` before auth resolves | `drive-preview.js` (network log) |
| 12 | Palette: token values only — no hardcoded color introduced; before/after screenshots (device + preview) for founder review | Device + preview |
| 13 | Web preview container: full email sign-up → code → onboarding → My Trips, driven headless; Google iframe renders | `drive-preview.js` |
| 14 | Post-merge on deployed `dev`: a real sign-up with a pool `+suffix` address receives a real Resend mail and completes; the SQL check **names the `railway` database** | Deployed-dev probe |
| 15 | `test-pool.js` / `seed-trip.js` / `smoke-api.js` green against a fresh local stack with profile pre-completion in place | Script run |

**Deliberate omissions, on the record:** Apple sign-in (iOS activation) · the ToS consent line (pre-alpha, with the documents) · photo upload (S3.3 — the affordance is absent, not disabled) · any backend completion enforcement (never — decision 11) · handle tombstones/cooldowns (ADR-015's invalidating condition) · interests-driven personalization (S4.3's call) · magic-link or OTP *sign-in* (the code verifies email; it is not an auth doorway) · invitation-email activation (infrastructure arrives here; that park stands, epic-map line).

## Out of scope

Publish + visibility (S4.1) · media pipeline (S3.3) · discovery feed and its personalization decision (S4.3) · friend graph · notifications · profile surfaces beyond the onboarding steps and the me-screen edit entry · any guard/isolation change · any ledger anything.

## Comments

*(none yet)*
