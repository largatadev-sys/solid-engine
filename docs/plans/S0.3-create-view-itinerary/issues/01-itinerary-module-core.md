# 01 — Backend: itinerary module core (migration + entity + repository)

**What to build:** The itinerary module's foundation: an additive Flyway migration for the `itinerary` table (app-side UUIDv7 id · `owner_id` not null, **no cross-module FK** — ADR-002 extends to schema coupling, and anonymization means the traveler row never disappears · `title` · `destinations` as `text[]` or jsonb, implementer's call recorded in Comments · nullable `start_date`/`end_date` · `state` default `'draft'` · `visibility` default `'private'` · `created_at`), the JPA entity (id handed at construction via `common/id` `UuidV7`, S0.2 convention), and the repository with the list access path: **composite index `(owner_id, id desc)`** — the owner-filtered keyset scan is the list's entire query plan.

No endpoints, no guard yet — this ticket exists so 02 and 03 each have one suspect when they fail.

**Blocked by:** —

**Status:** done

- [x] Migration is additive and runs via Flyway (schema-history row asserted; `spring-boot-starter-flyway`, not bare `flyway-core` — CLAUDE.md gotcha)
- [x] Entity constructs with app-side UUIDv7 id, `draft`/`private` defaults enforced at both layers
- [x] `destinations` round-trips as a list; empty list is unrepresentable at the entity level
- [x] Composite index `(owner_id, id desc)` exists
- [x] No FK to any identity-module table; no identity import in the module (ADR-002)

## Comments

**2026-07-16 — implemented.**

**`text[]`, not jsonb** (the implementer's call the ticket left open): the data is a homogeneous list of scalars with no nesting, so an array keeps the element type honest and leaves `unnest`/GIN available if E4's discovery searches by destination. jsonb would buy schema flexibility this field explicitly does not want. Hibernate needs `@JdbcTypeCode(SqlTypes.ARRAY)` to map it — without that the default is to serialize the list into one opaque value, queryable by nothing.

**The empty-destinations rule lives in `Itinerary.draft`, not only in the DTO.** Bean Validation on `CreateItineraryRequest` protects one door; the factory makes the state unrepresentable for every caller, including S4.7's fork and any future import. Both exist deliberately — see ticket 03's comment on where that split bit.

**`ItineraryTest` now exists because the review's findings were invisible to every test that did.** The contract IT proves the *API* answers 400 — that is the DTO's Bean Validation working. Nothing proved the *type* refuses, so the factory could lose two rules with the suite still green. The unit test is the one that would have caught it, and it is where the "unrepresentable for every caller" claim is now actually held.

**Code review caught the principle being stated and then not followed.** Two rules the DTO enforced were missing or weaker in the factory: `title ≤ 120` was absent entirely (a bare `TEXT` column — S4.7's fork could persist a 10 KB title), and blank destination entries were *filtered* rather than rejected, so `["Sapporo", ""]` was a 400 through the API and a silent data-loss through any other caller. Both fixed: the factory now states every rule the DTO does, and `MAX_TITLE_LENGTH` lives on the entity with the DTO's `@Size` referencing it — an annotation needs a compile-time constant, so that is the only sharing available, and without it the two limits drift the first time either is changed alone. The lesson worth keeping: "both layers state the rule" is a claim that decays silently unless the sets are compared deliberately.

`ItineraryState`/`Visibility` ship their full vocabulary (`draft→active→completed→published`, `private/unlisted/public`) though S0.3 produces only the first of each: the states are the domain's, decided at design time in Artifact 02, and an enum that grew one value per story would read as if the model were being discovered. `friends_only` is deliberately absent — a value nothing can produce is a value that lies.
