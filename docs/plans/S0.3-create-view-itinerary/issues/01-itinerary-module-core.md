# 01 — Backend: itinerary module core (migration + entity + repository)

**What to build:** The itinerary module's foundation: an additive Flyway migration for the `itinerary` table (app-side UUIDv7 id · `owner_id` not null, **no cross-module FK** — ADR-002 extends to schema coupling, and anonymization means the traveler row never disappears · `title` · `destinations` as `text[]` or jsonb, implementer's call recorded in Comments · nullable `start_date`/`end_date` · `state` default `'draft'` · `visibility` default `'private'` · `created_at`), the JPA entity (id handed at construction via `common/id` `UuidV7`, S0.2 convention), and the repository with the list access path: **composite index `(owner_id, id desc)`** — the owner-filtered keyset scan is the list's entire query plan.

No endpoints, no guard yet — this ticket exists so 02 and 03 each have one suspect when they fail.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] Migration is additive and runs via Flyway (schema-history row asserted; `spring-boot-starter-flyway`, not bare `flyway-core` — CLAUDE.md gotcha)
- [ ] Entity constructs with app-side UUIDv7 id, `draft`/`private` defaults enforced at both layers
- [ ] `destinations` round-trips as a list; empty list is unrepresentable at the entity level
- [ ] Composite index `(owner_id, id desc)` exists
- [ ] No FK to any identity-module table; no identity import in the module (ADR-002)

## Comments
