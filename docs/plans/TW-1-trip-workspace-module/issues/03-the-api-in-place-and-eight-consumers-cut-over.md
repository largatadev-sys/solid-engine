# 03: The three interfaces, implemented in place, and eight consumers cut over

**What to build:** the trip module's front door, complete, while the code behind it has not moved. The trip interface gains the three reads outside callers make that it does not carry today — a trip's teaser, titles by id, and the share card's version; a plan interface takes the plan, the day and the activity reads off the trip interface, where the boundaries story knowingly left them; a membership interface is minted with the seven acts outside callers invoke, measured at build time against the call sites and nothing else — admission, whether a traveler is a member, the roster, a workspace's id, trip ids by workspace, whether a trip is archived, and the trips in a traveler's sight. Each is implemented by an old-world class implementing the new interface, which is the permitted direction, so no migration window exists yet.

Then every consumer outside the god module and its two satellites — the invitation service, the join service and its card service, the poll service, and the three transport classes — switches its field to the interface. Admission absorbs the membership-arrived publish, so the event has one publisher instead of three, and the invitation package's own copy of that event is deleted. Postcard and publication are untouched here: the facade still implements the trip interface until it retires.

**Blocked by:** 02 (The events, and three cycles broken in place).

**Status:** ready-for-agent

- [ ] Each interface declares only methods a caller outside the trip module invokes, checked against the call sites rather than against the services
- [ ] No file outside the old package, workspace and membership names the itinerary service, the workspace service, the membership service or the share-card service — checked by a search
- [ ] Admission publishes membership arrived exactly once, and neither invitation nor join publishes it any more
- [ ] The join module's supersede listener and the transport module's admission listener consume the trip module's record; the invitation package's record is gone
- [ ] Every integration test passes with no edited assertion; import lines may move
- [ ] No migration window predicate exists in either guard

## Comments

**2026-09-08 — built.** Three interfaces in `trip/api`, implemented by old-world classes, and every outside consumer cut over. Nothing moved.

*The api, measured against the call sites and nothing else.* Grepping each consumer for `workspaces.`/`itineraries.`/`shareCardVersions.` gave exactly ten distinct methods, which is the api:

- **`MembershipApi` — seven**, on `WorkspaceService`: `admit`, `isMember`, `membersOf`, `workspaceIdOf`, `tripIdsByWorkspace`, `isArchived`, `tripIdsInSightOf`. Three took the Trip noun at the boundary (`admitMember`→`admit`, `itineraryIdsByWorkspace`→`tripIdsByWorkspace`, `itineraryIdsInSightOf`→`tripIdsInSightOf`); the interface is new surface, so this is not the ticket-09 rename running early.
- **`TripApi` — seven**, on the facade: `factsOf` and `frozen` and the two publish flags it already had, plus the three the spec's comment predicted — `teaserOf`, `titlesByIds`, `shareCardVersionOf`, written as raw SQL beside the facade's existing reads so the module has one implementation to convert at ticket 08 rather than two.
- **`PlanApi` — three**: `planOf`, `dayFactsOf`, `activityFactsOf`, taken **off** `TripApi` where the boundaries story left them.

*Two view records had to move with the interfaces.* `membersOf` returns `MembershipView` and `teaserOf` returns `TripTeaser` — both plain records with no entity in them, so both are now `trip.api` types, which is what the spec means by "the view records". `MembershipRepository`'s JPQL constructor expression names the class by FQN, so it moved too.

*Divergences from the ticket, both forced and both small:*

1. **`MembershipArrived` has two publishers, not one.** The ticket said the publish folds into `admit`, leaving one. It folds — invitation and join no longer publish, and the invitation package's copy of the record is gone — but `WorkspaceService.formAround` also publishes, for the **owner**, who arrives when the workspace is formed and never passes through `admit`. Both are membership arrivals and both must reach the transport's admission listener. They are now the only two, both in one class, one per act.
2. **Postcard and publication took a three-line change here, not at ticket 08.** The ticket said they were untouched because the facade still implements `TripApi` — true, but splitting `PlanApi` off means their `planOf`/`dayFactsOf`/`activityFactsOf` calls no longer typecheck against `TripApi`. Each gained a `PlanApi` field. This is the change ticket 08 already accepted knowingly; it simply had to land with the split that caused it.

*Verified:* the criterion "no file outside the old package, workspace and membership names the four services" is met — that grep returns **empty**. Membership + invitation + join + poll + ws + workspace + postcard + publication ITs **443/443**; all six module guards **26/26**. Three test files took a renamed-symbol edit (`workspaces.admitMember` → `workspaces.admit`), assertions untouched.

*A trap that cost a diagnosis, worth the line.* `mvn -o -q test-compile` reported success on a tree where `MembershipRepository` was **missing the `MembershipView` import entirely** — incremental compilation left the old class file and never recompiled the file. The failure surfaced only at context startup as `Type MembershipView not present`, which arrived as **365 errors across every IT in the run** and reads as a catastrophic regression; the real count of broken things was one missing import. `mvn -o clean test-compile` named it in one line, and also surfaced the postcard/publication break above that the incremental build had hidden. Same family as the error-stub `.class` at ticket 02: **after moving or deleting a type, clean-compile before believing a green incremental one.**
