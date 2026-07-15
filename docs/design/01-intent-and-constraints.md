# 01 · Intent & Constraints — Largata  `[ALWAYS FIRST — declares the build mode]`

**Architect's question:** *Why am I building this, for whom, under what limits — and what does "done" mean for that reason?*

_Derived from Artifact 00 and the working sessions. Status: **proposed — pending founder ratification.**_

---

## Build mode

**Product.** One-way doors (domain model, tenancy, architecture) at production depth from day one; features cut aggressively; the alpha is judged against pre-committed **validation criteria**.

**Validation criteria (tiered — replaces "kill criteria" language by founder decision):**
- **Tier 1 — validated:** above the line → full speed; backlog reordered by signal.
- **Tier 2 — pivot trigger:** below the line → the *approach* changes (wedge feature, onboarding, target user). Forward motion, different direction.
- **Tier 3 — hard pause:** below the lower line → new feature development stops until the founders diagnose and decide. Not burial — a forced decision point.

Criteria content (metric, tiers, floor, EOI-gate) → **COO drafts, all founders ratify, signed before alpha launches** (register #1). Fundraising success is a business milestone, **not** a validation signal.

---

## Hypothesis

> We believe **groups of travelers** will adopt **a single shared trip space (plan + costs + record)** over their current patchwork of chat, Splid, and docs, because **the coordination pain of the patchwork is felt on every trip.**

---

## Actors

Traveler — sole v1 platform actor; trip-scoped roles `owner` / `member` · Visitor — unauthenticated, strictly read-only · Future: Vendor, Moderator, Influencer. → Artifact 00 §2.

## Who pays / primary user

No one pays at launch — the alpha is entirely free. The business model is **subscription-based: two tiers, Free and Subscriber**, arriving post-validation (Epic 7). The free/paid split is a founder decision (register #14), constrained: **gate capabilities, never a user's existing data.** Vendor/affiliate and payments revenue remain later phases. **Primary user: the group-trip organizer** — the person who creates the workspace and pulls others in. The hypothesis lives or dies on them.

## Non-goals

→ Artifact 00 §6: no in-app payments · no vendor features · no vendor APIs (link+unfurl only) · no moderation tooling · no influencer mechanics · no friend graph / friends-only visibility · no booking engine · no web surface · no subscription billing at launch (the entitlement seam ships early; billing is Epic 7).

## Scale assumptions

Alpha 2,000–3,000 users (capped) · Beta ~10,000 · overshoot absorbed by addition, not rewrite. At this scale the design driver is **access-control correctness, not throughput**.

---

## Non-functional requirements

| Concern | v1 commitment |
|---|---|
| **Availability** | Best-effort; single region; no on-call. Target: no outage a founder can't fix same-day. |
| **Latency** | Interactive reads < 500 ms p95. **Link unfurling is async by design** — items appear instantly as bare links and enrich when the unfurl returns (doubles as the UX answer to slow/blocked scrapes). |
| **Offline posture** | **(b) Read-cache + queued writes:** itinerary, ledger, diary viewable offline; edits queue and sync on reconnect. **(c) Offline-first is the declared target, not v1** — full local-DB sync with conflict resolution is a foundation-scale commitment that proves nothing the alpha needs proven. **Design obligation now:** the mobile data layer is built behind a repository/local-cache abstraction from day one (all reads through a local store the network populates) — the structure (b) needs anyway and the skeleton (c) grafts onto. No raw API calls scattered in UI code. → **ADR-001** in Artifact 04, with the b→c path and its honest cost (sync engine, conflict resolution) recorded. |
| **Consistency** | **Strong within a Workspace** (ledger sums, votes, membership — INV-7/8/10 tolerate no approximation) · **eventual on the public surface** (stars, feed, discovery may lag seconds). This split lets the social layer scale later without touching the collaboration core. |
| **Compliance** | Minimal PII by design. **Account deletion = anonymization** — personal data erased; ledger entries and ownership-transfer records survive anonymized (reconciles deletion with INV-4/INV-8). Built from day one, not retrofitted under a privacy request. |

---

**Resolution: ☑ Agreed** *(proposed solo — pending founder ratification)*
