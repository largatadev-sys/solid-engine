# 04 · Architecture & ADRs — Largata  `[PRODUCTION DEPTH for the bones; ADRs accrete]`

**Architect's question:** *What are the major pieces, how do they fit, and what assumption makes each choice correct?*

_Status: **proposed — pending founder ratification.** The bones below are fixed; the ADR log grows for the life of the system._

---

## Architecture overview

**Shape: modular monolith (backend) + cross-platform mobile client, joined at one API.**

```
┌─────────────────────────────┐        ┌──────────────────────────────────────────┐
│  MOBILE APP                 │        │  BACKEND — modular monolith (Spring Boot) │
│  React Native + Expo        │  HTTPS │                                          │
│                             │──JWT──▶│  API boundary (controllers)              │
│  · repository/local-cache   │        │  · Firebase JWT validation (resource srv)│
│    layer (ADR-001)          │        │  · AUTHORIZATION GUARD (→ Artifact 03)   │
│  · share-sheet extension    │        ├──────────────────────────────────────────┤
│    (dev-build, not Expo Go) │        │  Modules (= the aggregate boundaries):   │
└─────────────────────────────┘        │  · identity   (Traveler, anonymization)  │
                                       │  · itinerary  (Itinerary, Items, Forks)  │
        ┌──────────────┐               │  · workspace  (Membership, Invites,      │
        │ Firebase Auth │◀── sign-in ──│      Decisions/Votes, private Comments)  │
        └──────────────┘   (mobile)    │      └─ ledger (bounded submodule:       │
                                       │          Expenses, Splits, Transfers)    │
        ┌──────────────┐               │  · diary      (Diary, Grants, Entries)   │
        │ Object store  │◀── media ────│  · social     (public surface: Reviews,  │
        │ (S3-class)    │              │      Stars, public Comments, discovery)  │
        └──────────────┘               │  · unfurler   (async worker, ADR-007)    │
                                       ├──────────────────────────────────────────┤
        ┌──────────────┐               │  One PostgreSQL — single transactional   │
        │ Transactional │◀── invites ──│  home for all modules (ADR-002)          │
        │ email provider│              └──────────────────────────────────────────┘
        └──────────────┘
```

**Module boundary rule (the line the review gate checks):** modules reference each other **by ID and through service interfaces only** — never each other's tables, never each other's internals. The modules are the aggregate boundaries from Artifact 02; this rule is what keeps any of them extractable into a service later *by addition* (ADR-002's escape hatch).

**The ledger is a bounded submodule inside workspace:** own tables, own service interface, touched only through it. Promotion path to its own aggregate/service in the payments phase is designed, not improvised.

---

## Repository layout & shared resources (named decisions)

**Layout: one monorepo; independently-deployable units are root-level peers — never nested.**

```
largata/
  backend/    — the Spring Boot modular monolith (deploys on the PaaS train)
  mobile/     — the React Native + Expo app (ships on the Play train)
  docs/
    design/   — artifacts 00–07
    plans/    — story plans (immutable point-in-time intent)
  CLAUDE.md · BUILD_STATUS.md · REGRESSION_CHECKLIST.md
  docker-compose.yml · CI config · .env.example
```

**Layout reflects deployability:** `backend/` and `mobile/` ride independent release trains (above), so they are siblings at the root — the app is not a child of the service, the frontend does not live inside `backend/`. The top level reads as the system's independent parts. Future deployables join as peers by addition: the read-only web surface becomes `web/`, never a subfolder of either sibling.

**Shared / global resources — where the cross-cutting things live:**
- **Docs** — the design artifacts and story plans at root `docs/`; the bridge files (CLAUDE.md, BUILD_STATUS, REGRESSION_CHECKLIST) at repo root.
- **The API contract** — **no cross-language shared-code package** (Java and TypeScript cannot share source). The contract is Artifact 05 + each backend module's DTO package; the mobile app mirrors those shapes in `mobile/src/types/` — the one types location per 06b §6 — kept honest by the additive-only `/v1` rule (ADR-008), which is what makes a mirrored contract safe.
- **Root tooling** — `docker-compose.yml` (it spans the local full stack), CI config, and the secret-scan/gitignore setup live at the root, since they govern both peers.

---

## Cross-cutting concerns

- **Auth:** Firebase Auth owns credentials and social sign-in (Google + Apple — Apple mandatory on iOS when any social login is offered). The backend is a standard OAuth2 resource server validating Firebase JWTs (Spring Security). The domain keeps its own `Traveler` keyed by Firebase UID — **the provider owns credentials; we own identity** (ADR-006).
- **Authorization:** the single chokepoint guard per Artifact 03. All authority rules live in one place; no inline checks in transport or logic code (engineering principle P6 applied to authz; instantiated in 06b §8).
- **Errors & logging:** the global contract per engineering principles P2/P3 — one translation boundary, one handler, log-once, never log secrets/PII. Concrete taxonomy and format → `06b-engineering-decisions.md` §3–4.
- **Config:** env-vars only; `.env.example` with placeholders in the repo; secrets never committed (CLAUDE.md backstop + gitignore + pre-commit scanning).
- **Integrations:** Firebase Auth · S3-class object storage (diary/entry media — metadata in Postgres, bytes in the store, from day one) · a transactional-email provider for invites (pick at skeleton time; commodity choice, not an ADR) · Expo push notifications **deferred post-launch by founder decision** (backlog epic; nothing in launch scope depends on it — invites travel by email).
- **Analytics:** event instrumentation per register #2 (COO's wishlist; default set applies if late). Events emitted from the logic layer as part of each story's ACs — cheap now, archaeology later.

---

## Deployment & environments — two release trains, joined at the API

**Backend train (the playbook default, adopted):**
- **Local dev:** full-stack containerization — Spring app + Postgres (+ object-storage emulator) in local Docker, **ephemeral: a fresh DB every redeploy** (a clean slate makes local testing deterministic; this is where feature branches are tested). Behavioural parity with prod: same runtime, same migrations, same config surface. Containerization scope: **full app stack** — datastore-only rejected as the "works on my machine" generator.
- **Promotion:** `dev` (**long-lived shared preview** — persistent, accumulates state on purpose; reseed at the developer's discretion, never automatic) → `preprod` (pristine prod-copy — **data refreshed to mirror prod**, so verification happens against prod-like state) → `main` (production, real data). Branch→env mapping and git workflow live in CLAUDE.md.
- **Environment data lifecycle (a decision, not an accident):** ephemerality is a testing tool, so it lives where you test (**local**: fresh DB per redeploy); persistence lives where you preview (**`dev`**: long-lived) and verify (**`preprod`**: prod-mirrored).
- **Prod:** PaaS (app + managed Postgres + managed object storage). Different topology than local by design; parity is behavioural, not infrastructural.

**Mobile train (its own pipeline — the store is a gate we don't control; Android-only until the iOS activation, ADR-010):**
- Emulator / Expo dev-build (local, non-EAS) → local Docker backend
- **Play internal testing** → preprod backend
- **Play store release** → prod backend
- *(iOS phase, post-validation: TestFlight → App Store on the same rungs — requires the Apple Developer account and a macOS build path, per ADR-010.)*

**The joint discipline (hard requirement from release one):** a mobile app cannot be force-updated — store review takes days and users update at leisure, so **old app versions keep calling the API for weeks**. Therefore: **additive API changes only; backward compatibility is non-negotiable; the versioning policy is decided in Artifact 05, not improvised.** This is the one constraint that is genuinely different from web development.

**The walking skeleton deploys to the prod target** — auth → API → guard → domain → Postgres → response, plus the app installable via TestFlight/internal track. That end-to-end deploy validates both trains and the joint while the cost of being wrong is one thin feature.

---

## Deferred until validated (marked, per playbook §6)

Caching layer (Redis) · search/discovery index · read replicas · async queues beyond the unfurler · CDN for media · rate limiting beyond basics · RLS second wall (ADR-003's trigger) · offline-first sync engine (ADR-001's target). **All signal-triggered, never calendar-triggered.**

---

# ADR Log

### ADR-001 — Offline posture: read-cache + queued writes now; offline-first as declared target
- **Status.** Accepted · 2026-07-12
- **Context.** Users are travelers — dead zones, airplane mode, foreign SIMs. "The trip app that doesn't work on the trip" is a store-review headline. But full offline-first means a local DB + sync engine + conflict resolution for collaborative data — a foundation-scale commitment.
- **Decision.** v1 ships **(b)**: itinerary, ledger, diary readable offline via a local cache; edits queue and sync on reconnect. **(c) offline-first is the declared long-term target.** Design obligation now: the mobile data layer sits behind a repository/local-cache abstraction from day one — all reads through a local store the network populates; no raw API calls in UI code. (b) needs that structure anyway; (c) grafts onto it.
- **Alternatives rejected.** (a) online-required — fails the core usage context. (c) now — months of sync/conflict engineering that validates nothing the alpha tests.
- **Assumption that makes this right.** Queued writes with server-side ordering are acceptable for alpha-scale collaboration; true concurrent offline editing is rare enough to defer.
- **What would invalidate it.** Post-validation usage data showing meaningful engagement loss in low-connectivity contexts, or conflict-rate pain from queued writes → begin the (c) migration on the prepared abstraction. Honest cost recorded: b→c is still a real migration (sync engine, conflict resolution); the abstraction makes it possible, not free.

### ADR-002 — Modular monolith on the aggregate boundaries; one PostgreSQL; object storage for media
- **Status.** Accepted · 2026-07-12
- **Context.** Domain has many moving parts; instinct suggested microservices / multiple DBs. But: alpha 2–3k users (three orders of magnitude inside one Postgres's headroom), one developer + agent, and the Workspace aggregate demands *transactional* consistency (INV-7/8) — splitting the ledger into a service turns a money ledger's invariants into a distributed-consistency problem.
- **Decision.** Modular monolith; module boundaries = the Artifact 02 aggregates; modules interact by ID + service interface only; **one PostgreSQL** as the single transactional home; **S3-class object storage for media** (photo-heavy diaries; bytes never in the relational DB); the ledger as a bounded submodule with a designed promotion path.
- **Alternatives rejected.** Microservices — all cost (distributed transactions, N pipelines, network failure modes between our own components), zero benefit at this scale; solves team-scaling problems we don't have. Multiple databases — breaks the transactional home for no load reason.
- **Assumption that makes this right.** Load stays within a single Postgres's comfortable range through beta (~10k users) — by a wide margin.
- **What would invalidate it.** A *measured* post-validation signal: sustained load approaching single-instance limits, or one module's change/deploy cadence diverging hard from the rest → extract that module along its existing interface. Never calendar-triggered.

### ADR-003 — Authorization: single chokepoint guard now; row-level security as the post-validation second wall
- **Status.** Accepted · 2026-07-12
- **Context.** The Workspace is the isolation boundary (Artifact 03); a silent leak is the product's worst failure. Per-service checks fail by omission; RLS is strong but Largata's visibility logic (public/unlisted/published-state/diary-grants) is object-shaped and painful as row policies, with connection-pool friction.
- **Decision.** One authorization guard resolves `(user, workspace) → Membership` before any workspace-scoped operation; service methods **require** the resolved Membership as a parameter — unbypassable by structure. **RLS adopted as defense-in-depth later** (data is precious; a second wall beneath the guard is purely additive).
- **Alternatives rejected.** Per-service checks (safety by vigilance) · RLS-only now (cost and policy complexity without v1 benefit while the guard stands).
- **Assumption that makes this right.** A structurally-enforced single chokepoint is sufficient isolation at alpha/beta scale.
- **What would invalidate it.** Any app-layer leak → RLS immediately. Otherwise: the post-validation hardening phase adopts it on schedule (the playbook's tenancy-boundary verification).

### ADR-004 — Mobile: React Native + Expo
- **Status.** Accepted · 2026-07-12
- **Context.** Solo developer, first mobile app, both iOS and Android at launch (hard constraint), strongest recent skill: React/Next.js.
- **Decision.** React Native + Expo (dev-build workflow; **build pipeline: local builds, no EAS — ADR-010**). Maximizes skill transfer; one codebase for two platforms; TypeScript throughout the client; future web surface shares logic (and potentially components via RN-Web) with the React ecosystem.
- **Alternatives rejected.** Flutter — capable, but a new language (Dart) and ecosystem with zero transfer from existing skills and no web-code sharing. Kotlin Multiplatform — shares logic, not UI; still two native UIs, the exact workload to avoid. Two native codebases — infeasible solo.
- **Assumption that makes this right.** Expo's capability surface covers the app's needs; the one known exception (share-sheet capture needs a native extension) is served by the dev-build path, not plain Expo Go.
- **What would invalidate it.** A required native capability Expo/dev-builds cannot reach, or sustained performance pain in core flows that profiling attributes to the framework.

### ADR-005 — Backend: Java + Spring Boot
- **Status.** Accepted · 2026-07-12
- **Context.** Developer's primary specialty. The domain needs a strong transactional story (INV-7/8 as transactional operations) and a mature security layer to host the authorization guard.
- **Decision.** Java + Spring Boot: Spring Web (API), Spring Security (JWT resource server + the guard), Spring Data/JPA + Flyway-class migrations, `@Transactional` aggregate operations, `@Async` for the unfurler worker.
- **Alternatives rejected.** Node/TypeScript backend (one language across the stack) — real appeal, but trades away the developer's deepest expertise on the layer where correctness matters most. Anything new-to-learn on the backend — the learning budget is already spent on mobile.
- **Assumption that makes this right.** Development speed and correctness both track developer expertise; the mobile side is where the new-skill risk budget goes.
- **What would invalidate it.** Nothing foreseeable at this scale; revisit only if team composition changes.

### ADR-006 — Auth: Firebase Auth (managed identity); backend as OAuth2 resource server
- **Status.** Accepted · 2026-07-12
- **Context.** The product needs Google + Apple sign-in (Apple mandatory on iOS alongside any social login), email verification for the invite flow, reset, refresh, revocation. Hand-rolling ≈ 2–3 weeks of security-critical work that tests nothing, owned forever.
- **Decision.** Firebase Auth owns credentials and sign-in flows (first-class RN SDKs; free tier far beyond 10k users). Launch sign-in: Google + email; **Sign in with Apple activates with the iOS phase** (the Apple mandate applies only on iOS). Spring validates Firebase JWTs as a standard OAuth2 resource server. Domain keeps its own `Traveler` keyed by Firebase UID — provider owns credentials, we own identity.
- **Alternatives rejected.** Hand-rolled Spring Security + JWT — known territory but weeks of undifferentiated security work. Auth0/Cognito/Supabase — viable peers; Firebase wins on RN SDK maturity + free tier + smallest integration surface for this stack.
- **Assumption that makes this right.** Alpha/beta volumes stay in the free tier; no compliance need to own credentials.
- **What would invalidate it.** Pricing or lock-in pain at scale, or a regulatory requirement to hold credentials first-party → the Traveler-keyed-by-UID indirection is the designed exit.

### ADR-007 — Unfurler: in-process async worker; build Tier 1+2; buy as fallback
- **Status.** Accepted · 2026-07-12
- **Context.** Itinerary items arrive as links (share-sheet/paste); metadata must be fetched server-side (CORS, bot-blocking, caching). Tiers: 1 = Open Graph/Twitter-card/title tags; 2 = JSON-LD (schema.org Hotel/Event/…); 3 = per-site HTML parsers.
- **Decision.** An async worker module inside the monolith (queue + `@Async`), building Tier 1 + Tier 2 in-house; results cached by URL; **graceful degradation to bare link always**. Items enrich asynchronously (per 01's latency NFR). Tier 3 deferred until real usage names a site whose gaps hurt. Commercial unfurl APIs (Microlink/Iframely-class) recorded as the buy-fallback.
- **Alternatives rejected.** Separate unfurler service — deployment overhead without load justification (ADR-002 logic). Buy-first — Tier 1+2 is small to build, and the spike may show it suffices.
- **Assumption that makes this right.** OG/JSON-LD coverage on target sites is adequate and bot-blocking is survivable — **explicitly to be verified by the register #8 spike before the scraper story.**
- **What would invalidate it.** The spike (or production) showing heavy bot-blocking / thin coverage on must-have sites → switch to the buy-fallback behind the same worker interface, or add targeted Tier 3 parsers.

### ADR-009 — Subscriptions: entitlement chokepoint from Epic 1; store billing (RevenueCat-class) at Epic 7
- **Status.** Accepted · 12/07/2026
- **Context.** The business model is subscription-based (two tiers: Free / Subscriber), decided after the initial design pass. Launch is free; charging during alpha would contaminate validation (measuring willingness-to-pay before product pull) and TestFlight subscriptions are sandbox-only. Apple/Google require their in-app purchase systems for digital subscriptions (15–30% platform cut) — third-party billing in-app is a store rejection.
- **Decision.** Build the **seam now, the feature later**: one entitlement service in `common` — `can(traveler, capability)` — ships in Epic 1, returning full access for everyone; every potentially-gated feature asks it. Epic 7 (post-validation, pre-beta) integrates StoreKit/Play Billing via a RevenueCat-class wrapper: products in both stores, purchase/restore flows, server-side receipt validation, webhooks setting the entitlement state the service reads. Standing rule (founder-facing, register #14): the split gates **capabilities, never existing data** — a lapsed subscriber never loses access to trips, diaries, or ledger history they already have. **Changeability by design:** gates are unenforced until Epic 7 (the service answers full-access), enforcement is server-side (flipping a gate never requires a store release; only paywall UI rides the app train), and the context-aware signature keeps even per-workspace resolution absorbable later.
- **Alternatives rejected.** Billing at launch — contaminates validation, sandbox-only in alpha anyway, and spends pre-validation weeks on machinery that tests nothing. No seam until Epic 7 — retrofitting gating across fifty stories of scattered capability checks; the seam costs hours now versus a sweep later. Stripe-only billing — store rejection for digital subscriptions.
- **Assumption that makes this right.** Two tiers suffice (near-boolean entitlement); the alpha's job is product pull, not price discovery.
- **What would invalidate it.** A founder decision to charge during alpha (pulls Epic 7 into launch scope — revisit the validation criteria with it), or a multi-tier model (the entitlement service grows from boolean to capability-set — the seam absorbs this).

### ADR-010 — Platform sequencing & mobile build pipeline: Android-first; local builds, no EAS; manual store upload
- **Status.** Accepted · 13/07/2026 · partially supersedes ADR-004's build-workflow clause
- **Context.** The Apple Developer overhead (US$99/yr, plus iOS's build-toolchain demands) is real cost before validation. The RN/Expo single codebase means platform sequencing is a distribution decision, not an architecture one.
- **Decision.** **Android first at launch**; iOS activates once Android validates. Launch builds run **locally on the developer's machine** (Expo prebuild + Gradle for signed AABs) and are **uploaded manually** to the Play Console — no EAS at launch. Play internal testing serves as the pre-release track against preprod. **EAS is the declared later adoption, not a rejection** — the same posture as ADR-001's offline target: local now, cloud builds when the trigger fires.
- **Alternatives rejected.** Both platforms at launch — pays Apple's cost before any validation signal. EAS builds — a paid cloud dependency the Android toolchain doesn't need (Gradle runs anywhere).
- **Assumption that makes this right.** Android-only validation is representative enough of product pull; the alpha cohort can be recruited on Android (noted: iOS-heavy home market — a recruiting constraint, recorded in 00 §6).
- **The iOS build path is settled by the EAS adoption:** local iOS builds require macOS + Xcode, which the developer's PC cannot provide — **EAS is the recorded answer** (cloud iOS builds, no Mac purchase). **Adoption triggers, whichever fires first:** the iOS activation (EAS becomes necessary), or Android release cadence making manual build+upload a real cost (EAS becomes worth it — Play submission automation, signed builds off the dev machine).
- **What would invalidate it.** Validation signals showing the Android-only cohort is unrepresentative, or a partnership/press moment requiring iOS presence → pull the iOS activation forward — which pulls the EAS adoption forward with it.

### ADR-011 — The phased authorization guard: chokepoint in `common/authz`, membership lookup behind a resolver seam
- **Status.** Accepted · 2026-07-16 (S0.3 grilling) · extends ADR-003
- **Context.** ADR-003 fixed the pattern (one guard resolves membership; service methods require the resolved `Membership` — unbypassable by structure) but the first domain endpoint (S0.3) arrives before the Workspace exists: membership rows land at E1 (S1.1), yet the epic map demands the guard "from the first domain endpoint — not retrofitted." Also, the guard's future data owner (workspace module) and its first consumer (itinerary module) would otherwise form a reference cycle.
- **Decision.** The guard and the `Membership` value type live in **`common/authz`** — beneath the modules, like ADR-009's entitlement chokepoint — with the **permanent signature** `requireMember(traveler, itineraryId) → Membership`. *(Amended at implementation, S0.3: ADR-003's "a forgotten check is a compile error" holds — a service method demanding a `Membership` cannot be called without one. But `Membership` is **not unforgeable**: it is a record, so its canonical constructor is public, and the resolver seam means the legitimate producer always lives outside `common/authz` by construction — a closed constructor would have had to open. The guard defends against **forgetting**, which is the default-by-omission failure Artifact 03 rejected per-service checks over; it does not defend against code that deliberately fabricates a membership, which no signature can and which review catches on sight. `Membership`'s javadoc carries the honest statement.)* The membership **lookup** hides behind a one-method **`MembershipResolver`** interface: S0.3 ships an owner-based resolver in the itinerary module (`owner_id` match → synthesized `Membership{OWNER}`, else reject → 404-masked); **S1.1 replaces it** with the workspace module's row-backed resolver **and backfills workspaces for pre-E1 itineraries**. The seam that must never be retrofitted is the signature and the call-site discipline, not the storage. `Membership` therefore predates the workspace module by design — a future reader wondering why it lives in `common` is reading this ADR.
- **Alternatives rejected.** Seeding the workspace module early (guard beside its data) — plants an unspecced module and an immediate workspace ↔ itinerary cycle. Pulling S1.1's tables into S0.3 — re-litigates ratified epic-map scope to prove nothing E0 needs. Guard calling `ItineraryService` directly, edited at E1 — puts the swap *inside* the Full-rigor chokepoint and points `common` at a module (wrong dependency direction).
- **Assumption that makes this right.** 1:1 Workspace↔Itinerary (Artifact 02) holds, so resolving by itinerary id stays the natural key for itinerary-aggregate access even after real memberships arrive.
- **What would invalidate it.** Workspace↔Itinerary ceasing to be 1:1, or a second aggregate needing guard semantics the itinerary-keyed signature can't express → widen the guard's interface additively at that story, with this ADR superseded.

---

**Resolution: ☑ Agreed** *(proposed solo — pending founder ratification; ADR log accretes from here — every future significant decision lands as ADR-012+)*
