# 00 · Requirements Brief — Largata  `[FRONT DOOR — precedes Artifact 01]`

**Architect's question:** *What did we agree we're building, and is every one-way-door decision settled enough to start designing?*

_Transcribed from the founder discussion (largata.docx, 09/07/2026, as revised and converged in working sessions). Status: **proposed — pending founder ratification.** All sections were converged solo by the CTO; the other founders ratify or dispute before sign-off. Validation criteria deliberately excluded — they live at the validation gate (playbook §6), owned by the COO with founder ratification._

---

## 1. Problem & why-now → *feeds Artifact 01*

**Problem.** Group trips are coordinated across disconnected tools: bookings on Booking.com, expense splits in Splid, research and inspiration scattered across social media, decisions buried in group chats. Nobody has one view of the plan, the costs, or the decisions — during the trip it's chaos about where to go, where to eat, and who paid what; after the trip, no coherent record survives.

**Shape.** Drudgery + leakage. The coordination grind during the trip is the primary pain (the hook); the trip evaporating afterward is the secondary pain (the retention layer).

**What we're building.** A centralized trip space: everyone on the trip sees the plan, contributes to it, and has a live picture of what everything costs. The diary/highlights layer turns the finished trip into a record others can learn from — and reuse (fork) as a template for their own trip.

**Why now.** The founders hit this pain directly on a recent group trip — planned, yet chaotic on payments and decisions. The pieces all exist as separate apps; nothing unifies the trip lifecycle (plan → live → remember → reuse) as one shared object.

**Long-term direction (recorded, not v1).**
- In-app payments: the trip ledger eventually becomes a place money actually moves, not just a record. V1 ships a ledger only — designed append-only so the upgrade is addition, not rewrite.
- Vendor API integrations: itinerary items begin as links + unfurled metadata; the designed upgrade path is provider APIs (Booking.com, Skyscanner, direct vendor inventory), with affiliate revenue attached.
- **Subscription model:** the app is subscription-based — two tiers, **Free** and **Subscriber**. Launch is entirely free; the paid tier arrives post-validation (Epic 7). The free/paid split is a founder decision (register #14), constrained by one standing rule: **gate capabilities, never a user's existing data.**

**Resolution.** ☑ Agreed *(pending founder ratification)*

---

## 2. Actors → *feeds Artifact 01 + the domain (02) + authorization (04)*  · **one-way door**

**Traveler** — the sole platform actor in v1. Plans trips, invites co-travelers, collaborates, votes, logs expenses, writes diaries, publishes, browses/forks others' public itineraries. Does not pay at launch: **the alpha is entirely free.** The business model is **subscription-based (two tiers: Free / Subscriber)**, arriving post-validation as Epic 7 — the free/paid split is undecided (register #14). Vendor/affiliate and payments revenue remain later phases.

**Trip-scoped roles** (domain fact → Artifact 02; authorization → Artifact 04): **Owner** and **Member**. The owner holds destructive/administrative rights within a trip (delete trip, remove members, publish the itinerary); members collaborate.

**Visitor (unauthenticated)** — strictly read-only: can view public and unlisted published content, including its reviews and comments, and do nothing else. All interaction (review, comment, star, fork, collaborate) requires an account. **Email invite** is the onboarding path for co-travelers — an invited visitor authenticates and lands in the trip as a member.

**Future actors** (recorded, out of v1 scope): **Vendor** (businesses showcasing offerings), **Moderator** (content flagging/review), **Influencer** (marketing/growth program — implies a distinguishable account status later; no v1 design impact beyond not assuming all traveler accounts are forever identical).

**Resolution.** ☑ Agreed *(pending founder ratification)*

---

## 3. Core domain objects & the journey → *feeds Artifact 02*

**Glossary (canonical nouns — pending UX-engineer confirmation, register #3):** Traveler (User) · Trip Workspace · Itinerary · Itinerary Item · Fork Relationship · Diary · Diary Entry · Highlight · Comment · Review · Star/Upvote · Expense/Split (ledger).

**Structural decisions.**
- **Itinerary-first.** An Itinerary is created standalone (from scratch or by forking a public one). A Trip Workspace forms around it when collaboration begins; solo trips may live as itinerary-only.
- **Ownership split.** The **Itinerary** owns the plan (items, dates, external booking links). The **Workspace** owns collaboration: membership (owner/member), comments, votes, the expense ledger.
- **Diary is a first-class object** — the shared-album model. One **author-owner** per diary; contributors join only by the owner's consent; publication is the owner's sole right. A diary **references one itinerary**; one itinerary (and its fork lineage) can have **many diaries** — the owner's, collaborators', forkers' — each an independent lived perspective on the same plan. Published diaries surface as **Highlights** on the itinerary.
- **Fork copies the plan only.** Provenance is recorded as a Fork Relationship. A fork never copies diaries, ledger, comments, reviews, or membership.
- **Itinerary Items carry a source** from day one: `manual | link_unfurl | api:<provider>` — so the future vendor-API upgrade slots in behind the same item model without rework.
- **Visibility (v1 enum):** **public / unlisted (link-only) / private.** Friends-only is a designed-for, deferred fourth value — it arrives with the future friend-graph feature.
- **Published cost:** aggregate trip cost only; ledger detail never leaves the workspace.

**The journey.** Traveler signs up → creates an Itinerary from scratch or discovers and forks a public one → invites co-travelers (email invite → authenticate → join as member), forming the Trip Workspace → members collaboratively edit itinerary items, comment, vote → items link out to external bookings (the unfurler imports metadata in) → the trip happens; diaries and expenses accrete → trip completes → members leave reviews → the owner publishes the itinerary (choosing its visibility); diary authors independently publish their diaries, which surface as Highlights → other travelers discover, star, review, comment — and fork. **The loop closes: consumption feeds creation.**

**Implied lifecycles (formalized as state machines in Artifact 02):** Itinerary: draft → active → completed → published. Workspace: forming → active → completed → archived.

**Resolution.** ☑ Agreed *(pending founder ratification)*

---

## 4. The rules that must never break — invariants → *feeds Artifact 02*

**Access & privacy**
- **INV-1.** Only Workspace members can view or modify a non-published Workspace's contents (itinerary, diaries, ledger, comments, votes).
- **INV-2.** Publishing an itinerary exposes: the plan, its published diaries (Highlights), and the **aggregate trip cost only**. Never ledger detail or individual contributions. Never raw (unpublished) diaries. Workspace membership itself is never exposed; member identities appear only where an author has published their own diary.
- **INV-2a.** Every Diary has exactly one author-owner. Contributing to a diary requires the owner's consent. Publishing a diary is the owner's sole act. No one publishes or modifies another's diary.
- **INV-3.** Unauthenticated visitors are strictly read-only: all interaction (write, react, fork) requires an account.

**Structural integrity**
- **INV-4.** Every Workspace has exactly one owner at all times. On owner departure or account deletion, ownership transfers to a member or a member claims it — it never vanishes.
- **INV-5.** Every Diary references exactly one Itinerary; every diary contribution has an identified contributor and the owner's consent.
- **INV-6.** Every fork records its source (Fork Relationship); forked content contains plan data only — never diaries, ledger, comments, reviews, or membership.

**Ledger**
- **INV-7.** An expense's splits always sum exactly to the expense total.
- **INV-8.** Ledger history is **append-only** — corrections, waivers, settlements, and reassignments are new entries; nothing is silently edited or deleted. *(The rule that keeps the v1 ledger upgradeable to real payments.)*
- *(Recorded behavior, not an invariant: members can settle, reassign, waive, or absorb balances; removal from a workspace is never blocked by balance — but every such action is a ledger entry per INV-8.)*

**Collaboration**
- **INV-10.** One vote per member per decision; only Workspace members vote.

*(The founder equity/investor rules from the original discussion doc are corporate governance, not system rules — relocated to the shareholders' agreement.)*

**Resolution.** ☑ Agreed *(pending founder ratification)*

---

## 5. One-or-many / scale / tenancy → *feeds Artifact 03*  · **the big one-way door**

**Scale.** Alpha 2,000–3,000 users (capped) · Beta ~10,000. Overshoot is welcome: the architecture must absorb growth by addition, not rewrite — but the build targets these numbers.

**Tenancy.** **Many shared** — one common world, no isolated organizations. Inside it, the **Trip Workspace is the access-control boundary**: membership gates all private content (INV-1); published content is world-readable per its visibility level (public / unlisted / private). *One world, walled rooms.*

**Resolution.** ☑ Agreed *(pending founder ratification)*

---

## 6. Constraints & non-goals → *feeds Artifact 01 (non-goals) + Artifact 04*

**Hard constraints.**
- Mobile **native** via one cross-platform codebase. **Android first at launch; iOS follows once Android validates** — the Apple Developer overhead (US$99/yr + the macOS build toolchain) is deferred until the product earns it. The RN/Expo codebase keeps iOS a build-activation, not a rewrite (ADR-010).
- No bookings or payment processing on-platform: itinerary items link *out* to external booking pages; the unfurler/scraper imports metadata *in*. Link capture on mobile is share-sheet-first; the unfurler is a **server-side service** with graceful degradation to bare links (elaborated in Artifacts 02/04; spike registered).
- Alpha capped at ~2,000–3,000 users.

**Sequencing (recorded).** Android native first → iOS second (post-validation activation) → mobile-web screen third → full web app fourth; the later stages are post-launch and likely distant. **Known consequences, accepted:** shared links have no non-app fallback until a web surface exists — the viral link loop is deferred with it. And the **alpha cohort is Android-only** — recruiting must target Android users (a real constraint in iOS-heavy markets), and validation measures Android product pull; iOS adds a distribution unlock later, not a different product. (The read-only web view of published itineraries is the growth unlock when it comes, and it can be tiny.)

**Non-goals (v1 will not do).**
- No in-app payments or money movement (ledger records only; future phase).
- No vendor accounts or vendor-facing features.
- No vendor API integrations (link + unfurl only; APIs are the designed upgrade path, future phase, biz-dev gated).
- No moderation tooling (founder-handled during alpha).
- No influencer program mechanics.
- No friend graph and no friends-only visibility (the enum is designed for it; the graph is future).
- No booking engine — link-out only.
- No web surface.
- No subscription billing at launch (everything free; the entitlement seam ships in Epic 1; billing is Epic 7).

**Resolution.** ☑ Agreed *(pending founder ratification)*

---

## Success / validation → *not decided here*

**Validation criteria → the validation gate (playbook §6).** Tiered by founder decision — Tier 1 validated (full speed) · Tier 2 pivot trigger (the approach changes) · Tier 3 hard pause (feature development stops pending founder diagnosis — a forced decision point, not burial). Deliberately open at transcription time: the COO drafts the metric, thresholds, floor, and the EOI-gate decision; all founders ratify. **Hard deadline: signed before alpha launches.** Registered as open item #1. Engineering strawman on the table for him to react against: primary metric = % of registered users who create/join a Trip Workspace with ≥2 members within 14 days; judge at +12 weeks; ≥40% = validated, <40% = pivot trigger, <15% = hard pause; floor 500 registered users = inconclusive (extend or re-recruit); fundraising success is a business milestone, **not** a validation signal.

---

## Open-questions register

| # | Item | Owner | Deadline |
|---|------|-------|----------|
| 1 | Validation criteria: metric, tiers, floor, EOI-as-gate | COO drafts, founders ratify | **Before alpha launch** |
| 2 | Analytics event wishlist (instrumentation) | COO | **Before first story ships** (default set applies if late: signup, workspace created, invite sent/accepted, item added, vote cast, publish, fork) |
| 3 | Glossary nouns confirmed canonical | UX engineer | Before Artifact 02 finalizes |
| 4 | Review rules: who can review, how many, editable? | UX engineer + CTO | Artifact 02 |
| 5 | Comment/interaction surface details on public itineraries | UX engineer + CTO | Artifact 02 |
| 6 | Working rule handshake: screens defer to the domain model; flows implying domain changes route through the artifacts | UX engineer | Now |
| 7 | Link capture UX: share-sheet flow, pending/failed unfurl states, paste fallback | UX engineer | Before the scraper story |
| 8 | Unfurler spike: OG/JSON-LD coverage + bot-blocking on ~10 real target links; v1 = Tier 1 (Open Graph) + Tier 2 (JSON-LD), Tier 3 (per-site parsers) deferred | CTO | Before the scraper story; feeds an ADR in Artifact 04 |
| 9 | Vendor API integrations: affiliate applications, ToS review, which provider first | COO (biz-dev) + CTO | Future phase; item model designed for it from v1 |

---

## Handoff gate — may we start designing?

| Area | Feeds | One-way door? | Resolution |
|------|-------|:---:|:---:|
| Problem & why-now | Artifact 01 | | ☑ Agreed* |
| Actors | 01 + 02 + 04 | **yes** | ☑ Agreed* |
| Domain objects & journey | Artifact 02 | | ☑ Agreed* |
| Invariants | Artifact 02 | | ☑ Agreed* |
| Tenancy / scale | Artifact 03 | **yes** | ☑ Agreed* |
| Constraints & non-goals | 01 + 04 | | ☑ Agreed* |

\* *All resolutions are proposed-solo, pending founder ratification. The register holds no open one-way-door disputes (item #1, validation criteria, is validation-owned and does not block design).*

**Gate: OPEN.** Both one-way doors are Agreed and the register is clear of design-blocking items → **begin Artifact 01.** Founder ratification runs in parallel; any dispute raised reopens the affected section and its downstream artifacts.

---

## Sign-off

| Founder | Role | Date |
|---------|------|------|
| James Guardiario | | _pending_ |
| Edward Allan | | _pending_ |
| CJ Marsada | | _pending_ |

**We agree the above represents what we are building. The worth-continuing agreement (validation criteria) is committed separately at the validation gate before alpha launch.**
