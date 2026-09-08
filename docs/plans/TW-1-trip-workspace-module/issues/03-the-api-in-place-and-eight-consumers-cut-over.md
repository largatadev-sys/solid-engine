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
