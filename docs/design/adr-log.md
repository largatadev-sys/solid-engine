# ADR Log — Largata

**A flat list of every significant architectural decision and its rationale.** A *generated view*, assembled from Artifact 04 (ADR-001–007) and Artifact 05 (ADR-008) — not a source of truth. Change happens in the artifacts; regenerate this. Audience: technical stakeholders.

_Generated: 23/07/2026 · Sources: `04-architecture.md`, `05-api-conventions.md`_

## Decision index

| # | Decision | Status | Date |
|---|----------|--------|------|
| ADR-001 | Offline posture: read-cache + queued writes now; offline-first as declared target | Accepted | 12/07/2026 |
| ADR-002 | Modular monolith on the aggregate boundaries; one PostgreSQL; object storage for media | Accepted | 12/07/2026 |
| ADR-003 | Authorization: single chokepoint guard now; RLS as the post-validation second wall | Accepted | 12/07/2026 |
| ADR-004 | Mobile: React Native + Expo | Accepted | 12/07/2026 |
| ADR-005 | Backend: Java + Spring Boot | Accepted | 12/07/2026 |
| ADR-006 | Auth: Firebase Auth (managed identity); backend as OAuth2 resource server | Accepted | 12/07/2026 |
| ADR-007 | Unfurler: in-process async worker; build Tier 1+2; buy as fallback | Accepted | 12/07/2026 |
| ADR-008 | API versioning: path-versioned /v1, additive-only within a version | Accepted | 12/07/2026 |
| ADR-009 | Subscriptions: entitlement chokepoint from Epic 1; store billing (RevenueCat-class) at Epic 7 | Accepted | 12/07/2026 |
| ADR-010 | Platform sequencing & mobile builds: Android-first; local builds now, EAS at a declared trigger | Accepted | 13/07/2026 |
| ADR-011 | Phased authorization guard: chokepoint in `common/authz`, membership lookup behind a resolver seam | Accepted | 16/07/2026 |
| ADR-012 | PaaS: Railway (one project, three environments, Singapore); custom domains as the exit hatch | Accepted | 16/07/2026 |
| ADR-013 | Plans are day-indexed: Day + Activity structure; dates stay itinerary metadata | Accepted | 23/07/2026 |

## Decisions

### ADR-001 — Offline posture: read-cache + queued writes now; offline-first as declared target
- **Status.** Accepted · 12/07/2026
- **Context.** Users are travelers — dead zones, airplane mode, foreign SIMs. Full offline-first means a local DB + sync engine + conflict resolution for collaborative data — a foundation-scale commitment.
- **Decision.** v1: itinerary, ledger, diary readable offline via a local cache; edits queue and sync on reconnect. Offline-first is the declared long-term target. Design obligation now: the mobile data layer sits behind a repository/local-cache abstraction from day one; no raw API calls in UI code.
- **Alternatives rejected.** Online-required — fails the core usage context. Offline-first now — months of sync/conflict engineering that validates nothing the alpha tests.
- **Consequences.** Read access survives connectivity loss cheaply; the abstraction is the graft point for the future sync engine. Queued writes accept server-side ordering.
- **Invalidating condition.** Post-validation data showing engagement loss in low-connectivity contexts, or conflict-rate pain → begin the offline-first migration on the prepared abstraction (a real migration; the abstraction makes it possible, not free).

### ADR-002 — Modular monolith on the aggregate boundaries; one PostgreSQL; object storage for media
- **Status.** Accepted · 12/07/2026
- **Context.** Many domain moving parts suggested microservices/multiple DBs. But: alpha 2–3k users (orders of magnitude inside one Postgres's headroom), one developer + agent, and the Workspace aggregate demands transactional consistency (INV-7/8) — splitting the ledger into a service turns a money ledger's invariants into a distributed-consistency problem.
- **Decision.** Modular monolith; modules = the domain aggregates; interaction by ID + service interface only; one PostgreSQL as the transactional home; S3-class object storage for media; the ledger as a bounded submodule with a designed promotion path.
- **Alternatives rejected.** Microservices — all cost, zero benefit at this scale; they solve team-scaling problems this team doesn't have. Multiple databases — breaks the transactional home for no load reason.
- **Consequences.** One deploy, one DB to operate, transactions where the money is. Any module extracts later along its existing interface — addition, not rewrite.
- **Invalidating condition.** A measured post-validation signal: sustained load approaching single-instance limits, or one module's deploy cadence diverging hard → extract that module. Never calendar-triggered.

### ADR-003 — Authorization: single chokepoint guard now; RLS as the post-validation second wall
- **Status.** Accepted · 12/07/2026
- **Context.** The Trip Workspace is the isolation boundary; a silent leak is the product's worst failure. Per-service checks fail by omission; row-level security is strong but the visibility logic (public/unlisted/published-state/diary-grants) is object-shaped and painful as row policies.
- **Decision.** One authorization guard resolves (user, workspace) → Membership before any workspace-scoped operation; service methods require the resolved Membership as a parameter — unbypassable by structure. RLS adopted later as defense-in-depth (purely additive beneath the guard).
- **Alternatives rejected.** Per-service checks — safety by vigilance. RLS-only now — cost and policy complexity without v1 benefit while the guard stands.
- **Consequences.** A forgotten check is a compile error, not a leak; one rule the agent can be held to mechanically.
- **Invalidating condition.** Any app-layer leak → RLS immediately. Otherwise the post-validation hardening phase adopts it on schedule.

### ADR-004 — Mobile: React Native + Expo
- **Status.** Accepted · 12/07/2026
- **Context.** Solo developer, first mobile app, both iOS and Android at launch (hard constraint), strongest recent skill React/Next.js.
- **Decision.** React Native + Expo (EAS builds, dev-build workflow); TypeScript throughout; the future web surface shares the React ecosystem.
- **Alternatives rejected.** Flutter — new language/ecosystem, zero transfer, no web sharing. Kotlin Multiplatform — shares logic, not UI: still two UIs. Two native codebases — infeasible solo.
- **Consequences.** One codebase, maximum skill transfer. Share-sheet capture requires a native extension → Expo dev builds, not plain Expo Go.
- **Invalidating condition.** A required native capability dev-builds cannot reach, or profiled framework-attributable performance pain in core flows.

### ADR-005 — Backend: Java + Spring Boot
- **Status.** Accepted · 12/07/2026
- **Context.** The developer's primary specialty; the domain needs a strong transactional story (INV-7/8) and a mature security layer for the guard.
- **Decision.** Spring Web · Spring Security (resource server + guard) · Spring Data/JPA + Flyway · @Transactional aggregate operations · @Async unfurler worker.
- **Alternatives rejected.** Node/TypeScript backend — one language appeal, but trades away the deepest expertise where correctness matters most. Anything new-to-learn — the learning budget is spent on mobile.
- **Consequences.** Fastest correct path on the backend; the new-skill risk is isolated to the client.
- **Invalidating condition.** Nothing foreseeable at this scale; revisit on team change.

### ADR-006 — Auth: Firebase Auth (managed identity); backend as OAuth2 resource server
- **Status.** Accepted · 12/07/2026
- **Context.** Google + Apple sign-in needed (Apple mandatory on iOS alongside any social login), email verification for invites, reset/refresh/revocation. Hand-rolling ≈ weeks of security-critical work that tests nothing.
- **Decision.** Firebase Auth owns credentials and sign-in; Spring validates its JWTs as a standard resource server; the domain keeps its own Traveler keyed by Firebase UID — the provider owns credentials, we own identity.
- **Alternatives rejected.** Hand-rolled JWT auth — undifferentiated security burden. Auth0/Cognito/Supabase — viable peers; Firebase wins on RN SDK maturity + free tier + smallest integration surface.
- **Consequences.** Sign-in is configuration; the UID-keyed indirection is the designed exit from the provider.
- **Invalidating condition.** Pricing/lock-in pain at scale, or a compliance need to own credentials first-party.

### ADR-007 — Unfurler: in-process async worker; build Tier 1+2; buy as fallback
- **Status.** Accepted · 12/07/2026
- **Context.** Items arrive as links; metadata must be fetched server-side. Tiers: 1 = Open Graph/Twitter-card/title; 2 = JSON-LD (schema.org); 3 = per-site parsers (fragile, deferred).
- **Decision.** An async worker inside the monolith; Tier 1+2 built in-house; results cached by URL; graceful degradation to bare link always; items enrich asynchronously. Commercial unfurl APIs recorded as the buy-fallback.
- **Alternatives rejected.** Separate unfurler service — deployment overhead without load justification. Buy-first — Tier 1+2 is small, and the spike may show it suffices.
- **Consequences.** Zero partnership dependencies for v1; the same item pipeline later accepts webview capture (v1.5) and provider APIs (future).
- **Invalidating condition.** The register #8 spike (or production) showing heavy bot-blocking / thin coverage on must-have sites → buy-fallback behind the same interface, or targeted Tier 3 parsers.

### ADR-008 — API versioning: path-versioned /v1, additive-only within a version
- **Status.** Accepted · 12/07/2026
- **Context.** Mobile clients cannot be force-updated; store review + user update lag means multiple app versions call the API concurrently for weeks.
- **Decision.** /v1 path prefix; strict additive-only evolution within it (new fields/endpoints only; clients tolerate unknown fields); /v2 only for a genuinely breaking reshape — expected never during alpha/beta.
- **Alternatives rejected.** Header versioning — invisible, easy to fumble in a mobile client. No versioning — no escape hatch for a true break.
- **Consequences.** Old app versions keep working; API evolution discipline is enforced at review.
- **Invalidating condition.** A domain-level reshape inexpressible additively → /v2 with a sunset window measured against real version-adoption telemetry.

### ADR-009 — Subscriptions: entitlement chokepoint from Epic 1; store billing (RevenueCat-class) at Epic 7
- **Status.** Accepted · 12/07/2026
- **Context.** The business model is subscription-based (two tiers: Free / Subscriber). Launch is free; charging during alpha would contaminate validation, and TestFlight subscriptions are sandbox-only. Apple/Google require their in-app purchase systems for digital subscriptions (15–30% platform cut).
- **Decision.** Build the seam now, the feature later: one entitlement service — can(traveler, capability) — ships in Epic 1 returning full access; every potentially-gated feature asks it. Epic 7 (post-validation, pre-beta) integrates store billing via a RevenueCat-class wrapper (products, purchase/restore, receipt validation, webhooks → entitlement state). Standing rule: the split gates capabilities, never a user's existing data.
- **Alternatives rejected.** Billing at launch — contaminates validation and is sandbox-only anyway. No seam until Epic 7 — retrofitting gating across fifty stories. Stripe-only in-app — store rejection for digital subscriptions.
- **Consequences.** Monetization becomes a two-way door: Epic 7 is pure addition behind an existing switch. Pricing must absorb the platform cut.
- **Invalidating condition.** A founder decision to charge during alpha (pulls Epic 7 into launch scope — revisit validation criteria with it), or a multi-tier model (the entitlement service grows from boolean to capability-set — the seam absorbs it).

### ADR-010 — Platform sequencing & mobile build pipeline: Android-first; local builds, no EAS
- **Status.** Accepted · 13/07/2026 · partially supersedes ADR-004's build-workflow clause
- **Context.** Apple Developer overhead (US$99/yr + macOS toolchain) is real cost before validation; the RN/Expo single codebase makes sequencing a distribution decision, not architecture.
- **Decision.** Android first at launch; iOS activates once Android validates. Launch builds run locally (Expo prebuild + Gradle, signed AAB), uploaded manually to the Play Console; Play internal testing is the pre-release track. **EAS is the declared later adoption** — triggers: the iOS activation (local iOS builds need macOS the developer doesn't have; EAS is the recorded answer, no Mac purchase), or Android release cadence making manual builds a real cost.
- **Alternatives rejected.** Both platforms at launch — pays Apple's cost pre-validation. EAS — a paid cloud dependency the Android toolchain doesn't need.
- **Consequences.** The alpha cohort is Android-only (recruiting constraint in iOS-heavy markets, recorded). Sign in with Apple defers to the iOS phase.
- **Deferred decision at the iOS trigger.** Local iOS builds require macOS + Xcode — activating iOS means acquiring a Mac or reintroducing a cloud build service for iOS only.
- **Invalidating condition.** Validation showing the Android-only cohort is unrepresentative, or a moment requiring iOS presence → pull the activation forward and resolve the build path then.

### ADR-011 — The phased authorization guard: chokepoint in `common/authz`, membership lookup behind a resolver seam
- **Status.** Accepted · 16/07/2026 (S0.3 grilling) · extends ADR-003
- **Context.** ADR-003 fixed the pattern (guard resolves membership; service methods require the resolved `Membership`), but the first domain endpoint (S0.3) arrives before the Workspace exists — and the guard's future data owner (workspace) and first consumer (itinerary) would otherwise form a reference cycle.
- **Decision.** Guard + `Membership` value type live in `common/authz` with the permanent signature `requireMember(traveler, itineraryId) → Membership`; the lookup hides behind a one-method `MembershipResolver`. S0.3 ships an owner-based resolver; S1.1 replaces it with the workspace module's row-backed resolver and backfills workspaces for pre-E1 itineraries. The seam that must never be retrofitted is the signature and call-site discipline, not the storage. (`Membership` is not unforgeable — the guard defends against *forgetting*, not deliberate fabrication.)
- **Alternatives rejected.** Seeding the workspace module early — an unspecced module and an immediate cycle. Pulling S1.1's tables into S0.3 — re-litigates ratified scope. Guard calling `ItineraryService` — the swap lands inside the Full-rigor chokepoint, and `common` points at a module.
- **Consequences.** A forgotten check stays a compile error from the first domain endpoint; the S1.1 swap happened behind the seam without touching call sites.
- **Invalidating condition.** Workspace↔Itinerary ceasing to be 1:1, or a second aggregate needing guard semantics the itinerary-keyed signature can't express → widen additively, superseding this.

### ADR-012 — PaaS: Railway (one project, three environments, Singapore); custom domains as the exit hatch
- **Status.** Accepted · 16/07/2026 (S0.4 grilling)
- **Context.** Artifact 04 fixed the shape (PaaS + managed Postgres, three environments) but not the vendor. Solo operator, pre-validation cost sensitivity, Docker deploy, users/founders in Asia; operator already runs a structurally similar app on Railway.
- **Decision.** Railway: one project, `dev`/`preprod`/`prod` in Singapore, per-environment backend (Dockerfile) + own Postgres 18 (explicit image tag), branch-tracked deploys gated on green CI, platform probe = `GET /v1/health`. Custom domains from day one (`api[-env].largata.com`) so every baked URL is vendor-independent — leaving Railway is a DNS re-point.
- **Alternatives rejected.** Render — stronger managed-Postgres story but zero operator familiarity; snapshots + a verified restore cover the actual pre-validation risk. Fly.io / Cloud Run + Cloud SQL — heavier setup, ~3× always-on DB cost for nothing the alpha needs.
- **Consequences.** Familiar operations compound daily; the custom-domain seam is ADR-008's constraint applied to infrastructure.
- **Invalidating condition.** Real production data outgrowing snapshot-grade recovery (beta scale, ledger live) → PITR bar at post-validation hardening; sustained reliability pain → migrate along the domain seam.

### ADR-013 — Plans are day-indexed: Day + Activity structure; dates stay itinerary metadata
- **Status.** Accepted · 23/07/2026 (S1.3 grilling, founder-confirmed)
- **Context.** The original Itinerary Item carried a calendar date/time, making "Day 3" a projection of dates. The 07/18 mock plans by ordinal days (duration at create, day titles, empty days); itinerary dates are optional since S0.3; forking wants relative days — date-grouping collapses for undated plans and has no home for a day title or an empty day.
- **Decision.** The Itinerary aggregate gains a **Day** child (contiguous ordinal, optional title); **Activities** belong to a Day with manual sort order as the authoritative ordering (optional time-of-day is display metadata, local, timezone-free). Dates remain optional itinerary metadata; Day N's calendar date is derived, never stored. No span↔day-count invariant in MVP (S1.7 revisits). Entity noun becomes **Activity** (was Itinerary Item); `type`/`source` defer as columns to their first reader (E6/E4).
- **Alternatives rejected.** Date-anchored items — break for undated itineraries, hold no day titles or empty days, copy meaningless dates on fork. Dropping dates — ADR-008 forbids it and register #10 wants them.
- **Consequences.** `/v1` speaks `days`/`activities` permanently within v1 — accepted knowingly, even for E6's future unfurled hotels/flights. Ordinal contiguity is the aggregate's consistency job.
- **Invalidating condition.** Real demand for calendar-anchored planning (cross-timezone flights, calendar sync) → an optional per-activity datetime added additively beside the day structure.

---

*To regenerate: collect every ADR block from Artifacts 04/05, order by number, fill the index. Nothing here is authored — it is assembled.*
