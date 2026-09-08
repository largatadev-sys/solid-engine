# 08: The facade retires

**What to build:** the raw-SQL trip facade the content story built as scaffolding is replaced by the real thing, now that every table it read over belongs to the module it lives in. Its seven interface reads become implementations in the slices that own each answer, over those slices' own repositories — the trip's facts from the trip slice, a day's and an activity's facts and the plan from the plan slice, the frozen check and the published-flag pair from where the workspace state and the trip row live. The strangler waiver dissolves with it, which was the waiver's recorded condition.

One thing keeps its raw SQL and its reach. Destruction moves verbatim into a service of its own and keeps its deletes on the tables invitation, poll, join and chat own: an event-driven destruction is impossible while those tables carry foreign keys that the workspace must satisfy, and the one-transaction contract is pinned by test. It is the only place the trip module names another module's table after this story, and the boundaries story's twelve-table waiver list narrows to exactly those foreign tables, recorded as debt with the foreign-key-drop story as its trigger. Publication's flag write stays as the bridge the decommissioning story dissolves; it is recorded, not rewired.

Postcard and publication take the two-line change the boundaries story accepted knowingly: the plan and day and activity reads now come from the plan interface.

**Blocked by:** 07 (Ownership moves, and the windows close).

**Status:** ready-for-agent

- [ ] The facade class is gone, and the trip module contains no raw SQL outside the destruction service
- [ ] Every method of the trip and plan interfaces is implemented by the slice that owns its answer, over that slice's repositories
- [ ] The destruction service carries the destroy act unchanged, and the test pinning that the workspace world and its media die in one transaction passes unedited
- [ ] The waiver's table list names only the foreign tables destruction deletes from, and the trigger is recorded beside it
- [ ] Postcard and publication compile against the plan interface with no other change, and their guards pass
- [ ] The assertion-diff script reports zero differences; every integration test passes with no edited assertion

## Comments

**2026-09-08 — built.** `trip/service/TripService` — the raw-SQL facade CM-1 built as scaffolding — is **deleted**, and its ten interface reads are now repository-backed implementations in the slices that own each answer.

*Where each answer went, and why there.* `TripApi` → `record/TripFactsService` over `ItineraryRepository` (`factsOf`, `teaserOf`, `titlesByIds`, `shareCardVersionOf`, `markPublished`, `markUnpublished`) with `frozen` and the archived flag delegated to `workspace/WorkspaceService`, which owns workspace state. `PlanApi` → `plan/PlanReadService` over `DayRepository` and `ActivityRepository`. The **plan's implementation had to live inside `trip.plan`**, not in a neutral place: `Activity`'s and `Day`'s accessors are package-private, and the alternative — widening twenty accessors to public so a service elsewhere could read them — would have undone exactly the sealing this story exists to create. The trip-level half of a plan comes from `record/TripPlanHeaders`, a small published seam, so `PlanReadService` never touches the `Itinerary` entity.

*One behaviour was preserved deliberately rather than improved.* The facade's `markPublished` was an unconditional `UPDATE`; the entity's existing `publishTo` refuses when the trip is not COMPLETED. Routing the api through `publishTo` would have added a refusal to a path publication already gates, changing observable behaviour in a story whose whole claim is that nothing moved. The entity gained `markPublishedAt`, which mirrors the SQL exactly.

*Destruction keeps its reach, and now the build says so.* `destruction/TripDestructionService` carries `destroy` verbatim. **The waiver narrowed from CM-4's twelve tables to five**, because seven of the twelve are now trip's own: `itinerary`, `day`, `activity`, `workspace`, `membership`, `ownership_offer`, `ownership_transfer`. What remains foreign is `poll`, `invitation`, `join_request`, `join_link`, `chat_message` — each `NOT NULL REFERENCES workspace`, so an event-driven destruction is impossible before the FK drops. Trigger: the foreign-key-drop story.

**This is also ADR-038's deferred general SQL guard, delivered.** CM-4 recorded that the source-text guard "is TW-1's, deliberately", and `TripRawSqlWaiverTest` is it — three rules: raw SQL exists nowhere under `trip/` but the destruction service; the foreign tables destruction names are **exactly** those five; and the scan reads what it claims to (>8 tables, >100 files), so it cannot pass vacuously. Sabotage-checked by adding `"diary_entry"` to the workspace-children loop — the build goes red naming it. One trap in writing it: the first version scanned every quoted lowercase string in the file and caught the analytics event name `"trip_destroyed"` as a table, so the quoted scan is now scoped to the `for (String workspaceTable` loop and **throws** if that loop is ever renamed away, rather than silently reading nothing.

*Postcard and publication needed no change here* — they took their `PlanApi` field at ticket 03, when splitting the interface is what made their calls stop typechecking. Publication's `markPublished` write stays as CM-5's bridge, recorded and not rewired.

*Verified:* raw-SQL waiver guard **3/3** with its sabotage red, clean build first pass, full suite below.
