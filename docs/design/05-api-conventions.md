# 05 · API Conventions — Largata  `[MVP-THIN]`

**Architect's question:** *What rules will every endpoint obey, so I never re-decide them per feature?*

_Status: **proposed — pending founder ratification.** Conventions, not per-endpoint specs — individual endpoint contracts are elaborated with each story. Instantiates P5 (one consistent contract); the concrete shapes below are also referenced by `06b-engineering-decisions.md` §5._

---

## Style & naming

- **REST over HTTPS, JSON.** Plural-noun resources, kebab-case paths: `/trip-workspaces/{id}/expenses`, `/itineraries/{id}/items`.
- **Field naming: camelCase** (JSON convention; matches the TypeScript client).
- IDs are opaque and **unguessable** (UUIDv7-class) — a functional requirement, not a style choice: unlisted visibility relies on it (Artifact 03).

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

**Dependency outage:** 503 (a required dependency did not answer) — the one non-rejection status in the envelope. The `message` never names the failed dependency (topology is not public); `code` is `DEPENDENCY_UNAVAILABLE`. *(Added S0.1.)*

## The one error envelope

```json
{ "code": "NOT_A_MEMBER", "message": "You are not a member of this workspace.", "traceId": "…", "timestamp": "…" }
```

- `code`: stable machine string (`WORKSPACE_NOT_FOUND`, `SPLITS_DO_NOT_SUM`, `ILLEGAL_TRANSITION`…) — the mobile client branches on codes, never on messages.
- `message`: human-readable, safe to show.
- `traceId`: correlates to the server log line (P3).
- **Never**: raw stack traces, SQL, Spring default error pages, internal exception class names (P2).

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

*(This ADR also lives in Artifact 04's log — recorded here at its point of decision, assembled there.)*

## Conventions deferred until the surface needs them

Bulk operations · conditional requests/ETags · rate-limit headers · webhooks. Marked deferred (playbook §6) — decided when a story first needs one, as an ADR if significant.

**Resolution: ☑ Agreed** *(proposed solo — pending founder ratification)*
