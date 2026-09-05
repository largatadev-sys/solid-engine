# TW-1 — The Trip Workspace module: a design, parked

**Status: PARKED — designed, not pulled, nothing built.** No spec exists yet; this file is the design record, not immutable story intent. When TW-1 is pulled, a `spec.md` gets written beside this and this file becomes its background. **Trigger: founder pull.**

**Why parked rather than built:** the design is settled but the work ends two guarantees CM-1 was built around (see *What it costs*). **Sequenced 2026-09-05 at CM-2's grilling: CM-1 lands first (rot-fixed), CM-2 second, TW-1 third — never in parallel with CM-2.** CM-2 removes the content half's 34 reach-ins into trip internals by cutting the readers over; TW-1 then moves a package with only the trip left in it. Record: `docs/plans/CM-2-diaries-and-postcards/grilling.md`.

**Companion artifact** (the same design, visual): *Trip Workspace Module* — https://claude.ai/code/artifact/466bdede-0ca2-4afd-b6d9-28b8addaac97

---

## What this is

A rework of the trip domain out of `com.largata.itinerary` — the god module — into one bounded context that reads as a microservice, inside the single deployment. It is the strangler's **move-in-place** half, as distinct from CM-1's **fork-and-cutover** half.

Two strangler strategies, and the distinction is the whole reason this design exists separately from CM-1:

- **Fork-and-cutover** — new tables, built dark, backfilled at cutover, then switch. Correct when *semantics change*. That is what CM-1 did for diary, postcard and publication: minting, containment and authorship are all new behaviour.
- **Move-in-place** — relocate the code and the tables into the new module; same endpoints, same rows, no dark window, no backfill. Correct when semantics *do not* change. **The trip's semantics did not change in CM-1**, so the trip was never going to be forked — it gets moved. CM-1 built it as a facade because CM-1's job was the content model.

**The trip cannot be forked, and this is checkable.** `workspace.itinerary_id → itinerary.id`, and `membership`, `poll`, `invitation`, `join_link`, `join_request`, `ownership_offer` and `ownership_transfer` all hang off `workspace`. A trip created in a forked table would have no workspace — so no members, no chat, no polls. Forking the trip means forking fourteen tables and the entire collaboration world at once.

## The unit: the Trip Workspace, not the trip

The bounded context is larger than "the trip", and the code decides it, not preference:

- `ItineraryService:109` calls `workspaces.formAround(...)` **inside the trip's own creation transaction**, and `WorkspaceFormationRollbackIT.aFailureFormingTheWorkspaceRollsBackTheItinerary` exists purely to pin that they roll back together.
- Lifecycle transitions write workspace state too (`markCompleted`, `markActive`).
- **INV-4 — "an itinerary always has an owner" — is stored as a membership row**, so the invariant spans the trip table and the membership table. By the aggregate test, one unit.
- Accepting an ownership offer rewrites membership in the same breath.

The glossary already names this context: *Trip Workspace — the private collaboration space around one Itinerary*.

## The structure

```
com.largata.trip/
├── api/                      ← the ONLY package another module may import
│   ├── TripApi.java             find · findAll · teaserOf · stateOf
│   │                            tripIdsInSightOf · bumpShareCardVersion
│   ├── PlanApi.java             planOf · activitySnapshot
│   ├── MembershipApi.java       rosterOf · membershipOf · admit · depart
│   │                            releaseEditingSession
│   ├── *View.java               records — never entities
│   ├── MembershipEnded.java     published events
│   └── TripExceptions.java      what callers must catch
└── internal/                 ← guard-enforced: no import from outside the module
    ├── trip/        Trip · TripRepository · TripService · TripController · DTOs · TripCategory · Visibility
    ├── plan/        Day · Activity · repositories · services · PlanSaveService · PlanVersionService
    │                · EstimatedCost · Day/Activity/Plan controllers · DTOs
    ├── editing/     EditLease · EditLeaseInserter · EditLeaseService · LeaseSubject · controller
    ├── history/     ActivityHistory · ActivityHistoryService · HistoryAct
    ├── workspace/   Workspace · Membership · services · RowBackedMembershipResolver
    ├── ownership/   OwnershipOffer · OwnershipTransfer · OwnershipService
    └── cover/       TripCoverService · CoverAudience
```

**Folding rule: domain first, layer as filename suffix.** The controller lives inside its slice — HTTP is an adapter that stops there, and everything about one feature sits in one folder. A layer folder grows with the whole codebase forever (`itinerary/web/` holds 13 controllers, `itinerary/api/` holds 40 DTOs, its root holds ~90 mixed files); a feature folder grows only with its feature and stops when the feature is done. Every new folder above lands between two and fourteen files.

**Why `internal/` exists:** Java has no visibility level between package-private and public, and sibling slices must see each other while other modules must not. The marker patches the missing level — it makes the guard one un-rottable rule (*no `.internal.` import from outside its module*) rather than a per-module allowlist someone must extend for every new slice, and it puts the violation in the import line where a human sees it. It is also Spring Modulith's convention, so adopting Modulith later needs no rearranging.

**Why one `api` package with three interfaces, and no god service:** the api is what a *module* publishes; slices don't publish to each other. Each interface is implemented directly by the slice that owns the answer — `planOf` is the plan's, `admit` is membership's — so no facade bean sits in the middle. Internally the ~10 existing services stay ten services: the move relocates them, it does not merge them. A single `TripService` would rebuild the god class and re-arm the self-invocation `@Transactional` trap that the `REQUIRES_NEW` inserters depend on avoiding.

## The schema

Schema `trip`, nine tables, each arriving by `ALTER TABLE … SET SCHEMA trip` — moved, never copied, so there is no fork, no backfill and no dual-home:

`itinerary` · `day` · `activity` · `edit_lease` · `activity_history` · `workspace` · `membership` · `ownership_offer` · `ownership_transfer`

Migrations live in `db/migration/trip/` on the global version sequence.

**Already clean:** `itinerary.owner_id` and `membership.traveler_id` carry **no foreign key** to `traveler`. The trip's data references nothing outside the boundary; the only inbound FK is `workspace.itinerary_id`, which points inward once the workspace is inside.

## Seven slices: three welded, four pre-cut

The test applied to each — *can this be written to in its own transaction, without the trip or plan row?*

| Slice | Status | What splitting it would take |
|---|---|---|
| trip | welded | the root |
| workspace | welded | formed in the trip's creation transaction; INV-4 spans both tables |
| ownership | welded | accepting an offer rewrites membership in the same breath |
| plan | pre-cut | move `plan_version` off the trip row; accept two-step creation. **Strongest case** — the glossary already separates Trip from Itinerary |
| editing | pre-cut | almost nothing — an abandoned session already self-expires |
| history | pre-cut | accept gaps: it becomes an after-commit event, so a crash loses an entry |
| cover | pre-cut | not worth it — writes one column on the trip row |

**Decision: stop at seven.** Every boundary is paid for on each call across it, forever, while the benefit only lands when something needs to move alone — and nothing does yet. Merging modules is expensive; promoting an internal slice is a package move, an api and a schema. Drawing the line here and moving it later costs roughly nothing.

## The rules (these generalize past TW-1 — they are the ADR's content)

1. **Cross-module calls through `api` only.** Interfaces and view records; **no JPA entity ever crosses**; an `api` may name only its own types and `common`'s. *(This is why `TripView` carries `lastEditedBy` as an id: `TravelerSummary` is identity's type, so the display name is resolved in the adapter and no consumer inherits a dependency on identity.)*
2. **Each data-owning module owns its schema**, migrations under `db/migration/<module>/`.
3. **No single transaction writes across a module line.** Reads are synchronous through the api (authorization *must* be synchronous — an eventually-consistent membership check is a security hole); reactions travel as events; the one cross-boundary write is `join → MembershipApi.admit`, its own transaction, idempotent because the acceptance is the consent.
4. **Dependencies point inward** — hexagonal's dependency rule without its folder ceremony. JPA-annotated entities remain the domain model; no parallel persistence model, no mappers.
5. **The boundary is enforced by the build** — the guard test now; Spring Modulith's `verify()` once the god module is deleted and stops tripping it.

**Classification of the non-modules:** `common` is a shared kernel (owns no tables, cannot be a module). `identity` is a shared kernel and the `traveler` FK stays — S5.5 anonymizes rather than deletes, so the reference never orphans. `media` is **shared infrastructure**, used the way `ObjectStore` is: writes to `photo` inside a module's transaction are allowed and do not count as crossing a boundary. `ws` is transport, not a bounded context.

## The wider decomposition this implies

One deployment, one Postgres, one schema per data-owning module:

`trip` (this) · `diary` · `postcard` · `publication` (CM-1, built dark) · `chat` · `poll` · `join` (invitations + join links + requests — ADR-032's two consent directions, one context) · `identity` (traveler · follow · verification, which touches only `common` and `identity`) · `media` · `feedback` (already service-shaped, own outbox) · `common` (kernel) · `ws` (transport).

`com.largata.itinerary` is deliberately absent: it is not part of the structure, it is what the strangler is digesting.

**What each outside module costs to keep outside:** chat — **nothing**, `chat_message` already carries no FK at all · poll — two FK drops (`poll → workspace`, `poll_vote → membership`), and "votes die with the membership" becomes an event rather than a cascade · join — one FK drop plus the `admit` call · content — nothing, already reads the trip through an api.

## Known debts, recorded rather than discovered

- **The legacy exemption.** The god module's content half reaches into trip internals **34 times** (`ItineraryRepository` ×16, `Itinerary` ×6, `DayRepository` ×6, `ActivityRepository` ×4, `ItineraryService` ×2) — sixteen of those are discovery's filtered queries, which cannot route through `api` without teaching the trip about discovery filters. So `com.largata.itinerary` alone is named a permitted legacy consumer, dissolution condition = the rewire deleting it. **Until then trip's internals stay `public` and the guard test carries the boundary alone**; package-private/javac enforcement arrives when the exemption dies.
- **Media's callback cycle.** Six modules implement `PhotoAudience` (identity, four in the god module, postcard). Media asks the owner *"may this traveler read it?"* while the owner calls media to store it. In-process that is dependency inversion and fine; as real services it is a runtime cycle, and the standard exit is signed URLs. Worth knowing before media's api is designed.
- **The FK drops lose a database guarantee.** Dropping `poll_vote → membership` means Postgres stops enforcing "votes die with the membership" and a service must. Same trade as CM-1's V52, and it earns the same treatment: a stepping IT proving the new mechanism works *before* the old one is removed.
- **Cross-schema FK extraction trap** (measured): `pg_dump -n <schema>` is **not standalone** when a cross-schema FK exists — and without `ON_ERROR_STOP` the restore continues, the table lands with data, and **the foreign key is silently absent.** The `traveler` FK is kept as deliberate debt with a known payment at extraction; this must be recorded wherever extraction is eventually done.

## What it costs

| Property | Before | After |
|---|---|---|
| Additive · dark | held through all of CM-1 | **ends** — first story to touch live code |
| No pre-existing test modified | held through all of CM-1 | **ends** — ~50 ITs need package updates; assertions unchanged, since paths don't move (ADR-008) |
| Strangler waiver | trip reads another module's tables | **dissolves** — the tables are its own, and the raw-SQL facade is deleted |
| Modules | itinerary (god) + workspace + membership | trip (one context) + a shrinking itinerary awaiting deletion |
| Safety net | — | compiler · Hibernate `validate` against the moved schema · 1,192 ITs. Every failure loud |

**Vocabulary consequence, deliberate:** afterwards the module is `trip`, the schema is `trip`, the table is `itinerary`, and the endpoint is `/v1/itineraries` — three vocabularies in one place, because ADR-008 freezes the wire forever. Renaming the table is possible but belongs after the move, not during it.

## Still open when this is pulled

- Whether the `plan` split happens at the move or later (recommendation: later).
- The transaction rule's remaining subjects, now that absorption removed most of them.
- Whether events get **built** or only **recorded** — after absorption, the four modules may have no event consumer at all until the rewire gives `TripDestroyed` live callers.
- **The connection ceiling**: the suite runs **26 distinct Spring context signatures** (21 of them one-offs from a class-local `@Import` or `@MockitoBean`) at 4 connections each — roughly **104 against `max_connections = 100`**. Per-module test slices are unaffordable until that is paid down, so "independently testable" is proven structurally by the guard, not at runtime.
- Story shape: this needs its own spec, tickets, and an **ADR amending ADR-002** (which currently says one Postgres is *the single transactional home* and modules interact by ID + service interface — schema-per-module and api-only sharpen both).

---

## How this was reached

*A design conversation, 2026-08-30 → 31, following CM-1's code review. Recorded because the reasoning is the valuable part and none of it is reconstructable from the diff.*

**The opening.** The founder asked why controllers sat in a separate `web/` folder and whether the four CM-1 modules could be restructured to "function like microservices." The first answer — that `web/` is the house convention — was correctly dismissed: *"the codebase just evolved into this house convention, and it's not what I wanted."*

**The target, in the founder's words:** cross-module calls through public api only · each module owns its database schema (single Postgres, separate schemas — "i don't want to deploy 5 databases") · events for consistency · the goal being to develop features independently, test in isolation, and swap modules later. A modular monolith with hexagonal layering, DDD organization and vertical-slice feature packages — *"microservices without the pain of multiple deployments."*

**The grilling** (`/grill-with-docs`, two rounds) settled: shared-kernel classification · the api rule including the strong form (an api may name only its own types and `common`'s) · enforcement by compiler where it reaches and guard test where it doesn't · Flyway as one instance with per-module folders · hexagonal's dependency rule without the ceremony. It also ruled **diary and postcard remain two modules** (founder override of a recommendation to merge them on the containment invariant).

**The pivot.** Q5 — "does `trip` get a schema?" — surfaced that CM-1's trip module owns **no tables at all**; it is a facade over the old world's rows under the strangler waiver, which the founder had ruled at CM-1's own grilling (B-fork rule 4, *trip data never forks*). The founder's reply — *"isn't this the goal of what we are doing here? that's why i am keen on reworking the old one into these 4"* — was correct about the destination, and exposed that only one of the two strangler strategies had been explained. Scope then narrowed to the trip alone: *"let's disregard also on the content half of it."*

**The boundary argument.** Asked whether the trip could be its own microservice, the evidence said yes — but the unit is the Trip Workspace, because creation, lifecycle and INV-4 span the trip and membership tables. The clinching property: **nothing the trip needs from outside is transactional.** It needs a caller id (which arrives in the token) and somewhere to put bytes. That is the real test of "could this be a service", not the folder layout.

**The structure questions** that followed were all about readability, and each resolved to the same principle — *folders say what code is about, suffixes say what it is*: why `internal/` (Java's missing visibility level; one un-rottable rule instead of an allowlist that decays) · why one `api` not seven (a slice is not a module; the moment a slice needs an api it has been promoted) · why not layer-first folders (they grow with the whole codebase — `itinerary/` is layer-first inside, and is the mess being escaped) · why module-to-module traffic can't use controllers (no token exists mid-operation; controllers answer viewer-relative rather than true; HTTP has no transaction propagation; `/v1` is frozen for a different audience).

**Rejected on the record, so they are not re-litigated:** full hexagonal folders (doubles the classes for a persistence swap that will not happen, against a dial that says MVP grade outside the ledger and the guard) · one god `TripService` · slices at the package root · per-module Flyway beans (Boot's `@ConditionalOnMissingBean(Flyway.class)` silently disables the auto-configured Flyway **and** its initializer, so it would mean hand-wiring the old world's 47 migrations too) · events for everything (authorization must be synchronous) · forking the trip (fourteen tables and the whole collaboration world).

**Verified facts that shaped it** (each measured, not assumed): the FK topology under the trip · 46 trip/plan files vs 22 content/social in the god module · 34 internal reach-ins from the content half · `itinerary.owner_id` and `membership.traveler_id` having no FK · `chat_message` having no FK at all · six `PhotoAudience` implementers · 26 Spring context signatures ≈ 104 connections · Boot 4.1's Flyway auto-config condition · cross-schema `pg_dump` losing FKs silently · Spring Modulith 2.1.1 tracking Boot 4.1 and being ArchUnit-based, so it fits the surefire layer.

## Comments
