# 05 · API Conventions — Largata  `[MVP-THIN]`

**Architect's question:** *What rules will every endpoint obey, so I never re-decide them per feature?*

_Status: **proposed — pending founder ratification.** Conventions, not per-endpoint specs — individual endpoint contracts are elaborated with each story. Instantiates P5 (one consistent contract); the concrete shapes below are also referenced by `06b-engineering-decisions.md` §5._

---

## Style & naming

- **REST over HTTPS, JSON.** Plural-noun resources, kebab-case paths: `/trip-workspaces/{id}/expenses`, `/itineraries/{id}/items`.
- **Field naming: camelCase** (JSON convention; matches the TypeScript client).
- IDs are opaque and **unguessable** (UUIDv7-class) — a functional requirement, not a style choice: non-enumerability of private and archived content relies on it (Artifact 03) *(originally motivated by unlisted visibility — deleted at S4.1/ADR-017; the property stays load-bearing)*.

## Method → status table

| Operation | Method | Success | Notes |
|---|---|---|---|
| Create | POST | **201** + created resource | |
| Full update | PUT | **200** + resource | |
| Partial update | PATCH | **200** + resource | |
| Fetch one | GET | **200** / **404** | 404 also masks existence of private resources (Artifact 03) |
| Fetch collection | GET | **200** + list — **never 404** | empty list is a result |
| Delete | DELETE | **204**, always | idempotent — deleting the deleted is still 204 |

**Domain-rule rejections:** 400 (validation) · 403 (not permitted / not a member) · 404 (not found or hidden) · 409 (conflict, e.g. illegal state transition). Mapping from the exception taxonomy → 06b §3.

**Not authenticated:** 401 — missing, expired, malformed, or badly signed credentials; `code` is **`UNAUTHENTICATED`**, one code for every flavor (the client's reaction is identical — refresh the token or go to sign-in — and finer distinctions only tell a prober which guess was warmer). Distinct from 403, which means *authenticated but not permitted*. Emitted by the security filter chain, not the exception handler — the request never reaches a controller — so it is the one envelope no `DomainException` can produce. *(Added S0.2.)*

**Dependency outage:** 503 (a required dependency did not answer) — the one non-rejection status in the envelope. The `message` never names the failed dependency (topology is not public); `code` is `DEPENDENCY_UNAVAILABLE`. *(Added S0.1.)*

## The one error envelope

```json
{ "code": "NOT_A_MEMBER", "message": "You are not a member of this workspace.", "traceId": "…", "timestamp": "…" }
```

- `code`: stable machine string (`WORKSPACE_NOT_FOUND`, `SPLITS_DO_NOT_SUM`, `ILLEGAL_TRANSITION`…) — the mobile client branches on codes, never on messages.
- `message`: human-readable, safe to show.
- `traceId`: correlates to the server log line (P3).
- `details`: **optional, omitted unless a code needs it** — a small map of code-specific data the client must act on rather than merely display. Added S4.18 (ADR-023) for `STALE_PLAN`, which carries `currentPlanVersion` so a refused save can offer an explicit re-based overwrite without a force flag. Additive under ADR-008: absent on every previously shipped refusal, so no response shape moved. **The bar is deliberately high** — a field here is a wire contract, so it exists only where the client's *next act* depends on the value; anything the traveler merely reads belongs in `message`. Never PII, never internals (P2/P3).
- **Never**: raw stack traces, SQL, Spring default error pages, internal exception class names (P2).

## Partial updates: merge-patch — absent means keep, explicit null means clear *(ADR-028, S4.25)*

**The standing convention for every field a traveler can empty.** A `PATCH` body distinguishes three states, and the distinction is the contract:

| The client sends | The server does |
|---|---|
| the key is **absent** | **keeps** the stored value |
| the key is present with **`null`** | **clears** the stored value |
| the key is present with a value | **replaces** the stored value |

**Why it is worth a convention rather than a per-endpoint choice.** Full-replace has no way to say "leave this alone", so a second writer of the same resource — a different screen, an older client, a background job — silently erases whatever it did not know to resend. Absent-means-keep is what makes a second writer *safe by construction*. Adopted at S4.25 for the itinerary update endpoint, replacing full-replace-with-exceptions, and binding on every clearable field added after it.

**Not every field is clearable, and the ones that aren't must refuse rather than accept.** A required field (`title`, `destination`) answers an explicit null with a **400 `VALIDATION_FAILED`**, never by clearing and never by silently keeping — a silent keep would make the two outcomes indistinguishable, which is the one thing this convention exists to prevent. A **replace-only** field (the trip's `currency`) takes absent-means-keep but refuses null the same way: it always has a value, so "no currency" is not a state the traveler can reach.

**Implementation note, because the obvious approach does not work.** Jackson 3 maps **both** an absent key and an explicit `null` onto `Optional.empty`, so an `Optional<T>` field cannot express this contract — it collapses exactly the two states that must stay apart, and does so silently, in a green build. `Patchable<T>` (`com.largata.itinerary.api`) carries the distinction: its deserializer returns a cleared wrapper for `null` and overrides `getAbsentValue` to return Java `null` for an absent key, so `Patchable.isAbsent(...)` is the seam and the merge happens in the request object before the domain sees it.

## The one pagination shape

**Cursor-based:** `{ "items": [...], "nextCursor": "…" }` — `nextCursor` absent/null when exhausted.
Chosen over page/offset because the system's big lists (discovery feed, workspace activity) are **append-heavy**, where offset pagination visibly breaks (duplicates/skips as new items land). One shape for every list in the API — no exceptions (P5).

## Auth

`Authorization: Bearer <Firebase JWT>` on every request **except** public reads. Unlisted reads authenticate by possession of the unguessable ID (Artifact 03). Token validation and the authorization guard sit at the API boundary (Artifact 04, cross-cutting).

## Versioning — ADR-008

**URI-path version, `/v1` from day one.** Within `/v1`, all changes are **additive only**: new fields (clients must tolerate unknown fields), new endpoints, new optional parameters. **Never** rename, retype, remove, or change the semantics of anything shipped — old app versions keep calling the API for weeks (the mobile-train joint, Artifact 04). `/v2` exists only for a genuinely breaking reshape — expected **never** during alpha/beta.

> **ADR-008 — API versioning: path-versioned `/v1`, additive-only within a version**
> - **Status.** Accepted · 12/07/2026
> - **Context.** Mobile clients cannot be force-updated; store review + user update lag means multiple app versions call the API concurrently for weeks.
> - **Decision.** `/v1` path prefix; strict additive-only evolution within it; clients tolerate unknown fields.
> - **Alternatives rejected.** Header versioning (invisible, easy to fumble in a mobile client) · no versioning (leaves no escape hatch for a true break).
> - **Assumption.** Additive evolution suffices through alpha/beta — the domain model's stability (Artifact 02 at production depth) is what makes this credible.
> - **What would invalidate it.** A domain-level reshape that cannot be expressed additively → `/v2`, with a sunset window for `/v1` measured against real version-adoption telemetry.

**Reachability is part of the rule — checked, not assumed** *(S4.29, 2026-08-23)*. The rule's subject is *what a released client can be holding*, so "is this field shipped?" is a branch question, not an API-surface one. Two changes at S4.29 looked like breaches and were not: `shareUrl` (`GET /v1/itineraries/{id}/join-link`) gained a `?v=N` suffix, and the anonymous `GET /v1/join/{token}/cover` moved from `Cache-Control: private` to `public`. Both fields were born at S4.28 and `git branch -r --contains` puts neither on `preprod` or `main` — no released app has ever seen either, so the "multiple app versions for weeks" context that motivates additivity does not yet apply to them. **Run that check before assuming a field is shipped**; had either been on `main`, this would have needed a real waiver or an additive second field. The cache-header half is additionally a *correction*: `private` on an anonymous route was wrong the day it was written, and the fix was scoped to a new `cachePublic` variant precisely because the same helper still serves two *authenticated* routes that must stay `private`.

*(This ADR also lives in Artifact 04's log — recorded here at its point of decision, assembled there.)*

## Conventions deferred until the surface needs them

Bulk operations · conditional requests/ETags · rate-limit headers · webhooks. Marked deferred (playbook §6) — decided when a story first needs one, as an ADR if significant.

**Resolution: ☑ Agreed** *(proposed solo — pending founder ratification)*
