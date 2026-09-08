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
