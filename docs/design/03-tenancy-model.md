# 03 · Tenancy & Isolation Model — Largata  `[PRODUCTION DEPTH]`

**Architect's question:** *How is one user's private data kept separate from another's, and at which layer is that boundary enforced?*

_Status: **proposed — pending founder ratification.**_

---

## Strategy

**Many shared, one world — shared schema, one relational database.** No tenant organizations exist; classic per-tenant isolation (schema-per-tenant, database-per-tenant) is **rejected as irrelevant** to a social platform.

The isolation boundary is instead the **Trip Workspace**: *one world, walled rooms.* Workspace membership gates all private content (INV-1). A nested, smaller boundary exists alongside it: the **Diary**, gated by its own contributor grants (INV-2a) — a different membership list from the workspace's.

**Why this matters at production depth despite "no tenants":** a workspace breach — showing a stranger someone's trip finances or unpublished diary — is the worst failure this product can produce. The enforcement pattern below is baked into every data access the system will ever make; changing it after fifty stories is a migration of every query. Decided now, explicitly.

---

## Shared vs. isolated

| Sphere | Contents | Read rule |
|---|---|---|
| **World-readable** | Published itineraries (per visibility), Highlights (published diaries on published itineraries), reviews, public comments, stars, public profiles, **aggregate trip cost only** | `public`: anyone, including unauthenticated visitors · `unlisted`: anyone holding the link (unguessable ID) · writes always require an account (INV-3) |
| **Workspace-walled** (INV-1) | Non-published workspace contents: the plan in progress, ledger detail (expenses, splits, transfers), private comments, votes, invitations, **membership itself** | Workspace members only, resolved per request |
| **Diary-walled** (INV-2a) | Any diary pre-publication; contribution rights always | Author-owner + granted contributors only; publication is the owner's sole act |

**Never crosses the wall, ever:** ledger detail, individual contributions, raw diaries, workspace member list (INV-2).

---

## Context propagation

```
Mobile app ──(auth token)──▶ API boundary: token verified → requester identity resolved
                                    │
                     workspace-scoped request?
                                    │
                        ┌───────────▼──────────────┐
                        │   AUTHORIZATION GUARD    │   ← the single chokepoint
                        │   (user, workspace) →    │
                        │   Membership{role}       │
                        │   or REJECT              │
                        └───────────┬──────────────┘
                                    │  resolved Membership object
                                    ▼
                     Service layer: workspace-scoped methods REQUIRE
                     the Membership as a parameter — uncallable without it
                                    ▼
                     Persistence: queries scoped by the workspace id
                     carried in the verified Membership
```

Public reads bypass the guard but pass a **visibility check** on the object (`public` / `unlisted`-by-ID / `private` → reject). Diary reads pass a **grant check** (author or contributor grant). No layer assumes another layer did the work — each hop is named and owned.

---

## Enforcement layer — the decision

**Chosen: (b) a single authorization chokepoint, made unbypassable by structure.**

One guard resolves `(user, workspace) → Membership + role` before any workspace-scoped handler runs. The guarantee is structural, not disciplinary: **workspace-scoped service methods require the resolved `Membership` object as a parameter.** The only producer of that object is the guard that verified it. A forgotten check is therefore a compile error, not a silent leak — safety by construction, not vigilance.

This is engineering principle **P6 (one typed gateway)** applied to authorization, and it is mechanically reviewable per story: *any workspace-table query reachable outside the guard's flow → violation.* It is also a single rule an agent can be pointed at in CLAUDE.md: **"all workspace access goes through the authorization guard; never query workspace tables directly."**

**Alternatives:**
- **(a) Per-service checks — rejected.** The default-by-omission pattern; its guarantee is "every developer and every agent session remembered, every time, forever." One forgotten check in one new endpoint = INV-1 breach, silent.
- **(c) Database row-level security — rejected for v1, adopted as the long-term second wall.** Data is precious; RLS under the chokepoint is *defense-in-depth* — purely additive later (the app layer never notices a second wall beneath it), unlike a migration. Deferred because Largata's visibility logic (public/unlisted/published-state/diary-grants) is object-shaped and gnarly as row policies, and connection-pooled user context is real friction — cost without v1 benefit while the chokepoint stands. **Adoption trigger:** the post-validation hardening phase (the playbook's "tenancy-boundary verification" item), or immediately upon any app-layer leak. → recorded as **ADR-003** in Artifact 04.

**Role enforcement rides the same guard:** the resolved Membership carries `owner | member`; owner-only operations (delete trip, remove member, publish, archive) check the role on the object the guard already produced — never inline against the database.

---

## Onboarding implications

- **Workspace creation is atomic with ownership:** the creator becomes `owner` in the same transaction — INV-4 holds from the first instant; no ownerless window exists, ever.
- **Invite acceptance:** the invited visitor authenticates; the invitation is addressed to an **email**, and acceptance requires the authenticated account's **verified** email to match it — no bearer token exists (the email is a notification; the in-app invitation inbox is the accept surface; a magic-link join is an additive post-validation option). Membership row created (`member`) → the walls open for that user in the same moment. *(S1.2 grilling, 2026-07-20 — replaces the original "single-use token" sketch.)*
- **Owner departure / account deletion:** ownership transfers to a member or a member claims it (INV-4) before the departing membership row is removed; deletion anonymizes the traveler, but their ownership-transfer record and ledger entries survive anonymized (per Artifact 01, Compliance).

---

## What a developer must be able to say (the done-bar)

> *"Every workspace-scoped request passes through the authorization guard, which resolves the requester's membership or rejects. Service methods cannot execute without the resolved membership. Public reads check the object's visibility level; unlisted reads rely on unguessable IDs; diary reads check contributor grants. The database is one shared schema; the walls are the guard — and post-validation, RLS beneath it."*

**Resolution: ☑ Agreed** *(proposed solo — pending founder ratification)*
