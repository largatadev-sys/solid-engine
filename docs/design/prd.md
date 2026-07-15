# Product Requirements Document — Largata

**A stakeholder-facing view of what we're building and why.** A *generated view*, assembled from the design artifacts — not a source of truth. Change happens in the artifacts; this is regenerated. If a stakeholder marks it up, changes flow back to the artifacts.

_Prepared for: the founders · Date: 12/07/2026 · Status: For review (pending founder ratification of the underlying artifacts)_

---

## 1. Overview

Largata is a mobile app that gives a group trip one shared home: the plan, the costs, and the memories in a single space every co-traveler can see and shape. Trips are planned together, expenses are tracked transparently, the experience is captured in shared diaries — and finished trips become public itineraries other travelers can discover, learn from, and reuse as the template for their own.

## 2. The problem

Group trips today are coordinated across disconnected tools: bookings on Booking.com, expense splits in Splid, research scattered across social media, decisions buried in group chats. Nobody has one view of the plan, the costs, or the decisions — during the trip it's chaos about where to go, where to eat, and who paid what; after the trip, no coherent record survives.

**Why now.** The founders hit this pain directly on a recent group trip — planned, yet chaotic on payments and decisions. The pieces all exist as separate apps; nothing unifies the trip lifecycle (plan → live → remember → reuse) as one shared object.

## 3. Users

| User | What they do with it | Pays? |
|------|----------------------|:---:|
| Traveler — trip organizer (primary) | Creates the trip, invites co-travelers, drives the plan | No — v1 is free |
| Traveler — co-traveler | Collaborates: edits the plan, votes, logs expenses, contributes to diaries | No |
| Traveler — consumer | Discovers published itineraries; stars, reviews, comments — and forks one as their own trip | No |
| Visitor (no account) | Views public content only; every interaction requires signing up | No |
| *Future:* Vendor · Moderator · Influencer | Post-v1 phases | Vendors — future monetization |

The business model is **subscription-based: Free + Subscriber tiers.** Launch is entirely free; the paid tier arrives after validation (the free/paid split is being decided by the founders, constrained by one rule: it gates capabilities, never a user's existing data). Vendor/affiliate and payments revenue follow in later phases.

## 4. Goals & success metrics

**Goal.** Validate that groups of travelers will adopt a single shared trip space (plan + costs + record) over their current patchwork of chat, Splid, and docs.

**Success metrics** *(the validation criteria — tiered: validated / pivot trigger / hard pause)*: **being finalized by the COO and ratified by all founders; committed before alpha launches.** Working strawman under review: % of registered users who create or join a trip with ≥2 members within 14 days — judged 12 weeks into the alpha (≥40% validated · <40% pivot trigger · <15% hard pause · under 500 registered users = inconclusive). The alpha is capped at 2,000–3,000 users. Fundraising is tracked as a business milestone, separate from validation.

## 5. What we're building (launch scope)

A native mobile app — **Android at launch; iOS follows once the Android launch validates** (one shared codebase makes iOS an activation, not a rebuild) — delivering:

1. **Trip planning, together** — create an itinerary, invite co-travelers by email, build the plan collaboratively; booking links from any site attach to the plan (bookings themselves stay on the provider's site).
2. **Group decisions** — propose options, vote, settle "where do we eat" in the app instead of the group chat.
3. **The trip record** — shared photo-diary albums with geotags; each traveler's own perspective on the same trip.
4. **The social surface** — publish a finished trip (public / link-only / private), where its diaries appear as highlights; other travelers discover, star, review, comment — and **fork** it as the starting point for their own trip, with the total trip cost shown (never the detail).
5. **The expense ledger** — log expenses, split them, see who owes whom, settle up after the trip; a full, tamper-proof history.
6. **Effortless link capture** — share a hotel or flight page into the app and the itinerary item fills itself in (title, image, price where available), falling back gracefully to a plain link.

**Definition of done for v1:** all six capabilities live in the app stores' testing tracks, running against production infrastructure, alpha community onboarded — and the validation criteria measurable from real usage.

## 6. Out of scope (v1 will not do)

No in-app payments or money movement (the ledger records; the payments phase moves) · no vendor accounts or vendor features · no provider API integrations (links + metadata only; APIs are the designed upgrade path) · no moderation tooling (founder-handled in alpha) · no influencer mechanics · no friend graph or friends-only visibility · no booking engine · no web app · no push notifications at launch · no subscription billing at launch (the paid tier arrives post-validation).

## 7. Roadmap — what's next

- **Next (post-validation):** **the subscription tier** (Free + Subscriber; split per the founders' decision — capabilities gated, existing data never) · a read-only web view of published itineraries — shared links open in any browser (the growth unlock) · push notifications · hardening (observability, backups, second security wall).
- **Later:** in-app search of providers via a built-in browser capture · the friend graph and friends-only sharing · vendor API integrations with affiliate revenue · vendor accounts · in-app payments on the ledger the v1 design already prepared · moderation tooling · the influencer program.

*(Directional, not commitments — sequenced by what the alpha teaches us.)*

## 8. Key decisions (for technical readers)

Ten architecture decision records — covering the mobile framework, backend, authentication, data isolation, offline behavior, link-metadata service, and API evolution — are maintained in the **ADR Log**, each with its rationale and the condition that would trigger a revisit. Available alongside this document.

## 9. Constraints & assumptions

- **Constraints.** Mobile native, Android-first (iOS activates post-validation; the alpha cohort is Android-only — recruiting targets Android users) · no bookings or payments processed on-platform · alpha capped at 2,000–3,000 users · shared trip links have no non-app fallback until the web view ships (accepted consequence; the viral link loop is deferred with it).
- **Assumptions.** Alpha ~2–3k users, beta ~10k — the architecture absorbs overshoot by addition, not rewrite · v1 is free; monetization arrives with the vendor/payments phase · founders handle moderation during alpha · the validation criteria are signed by all founders before alpha launches.

---

*Regenerated from the design artifacts (00–07). This document is assembled, never authored — the artifacts stay the source of truth.*
