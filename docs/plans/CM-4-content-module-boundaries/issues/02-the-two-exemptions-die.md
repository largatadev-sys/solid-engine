# 02: The two exemptions die

**What to build:** the last two boundary guards that name a class to let through stop needing to. Trip publishes an interface carrying exactly the six acts its two callers invoke — the trip's facts, a day's facts, an activity's facts, whether the trip is frozen, the plan, and the published-flag pair — and the facade implements it. Publication publishes an interface carrying the one act its caller invokes, in an `api` package it does not have today. Postcard, publication and the diary controller hold those interfaces instead of the concrete services, and the by-name exemptions in both guards are deleted.

Each interface carries what its callers actually call and nothing more: an interface mirroring the service behind it publishes internals by another route. The trip interface is knowingly provisional — the trip-module story splits it three ways against its relocated code, which is a two-line change in two callers, accepted rather than leaving a breach standing for two stories.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Neither guard names a class as an exemption; both front doors are the module's published contract and its refusals
- [ ] No file outside the trip module names the trip facade; no file outside publication names its object service
- [ ] Each interface declares only methods a caller invokes, checked against the call sites rather than against the service
- [ ] Publishing, unpublishing, republishing, posting on a trip day and posting from an activity all behave exactly as before
- [ ] The published-flag pair is still recorded as the module-crossing write it is, and is not disguised as a read
- [ ] Every existing test passes with no edited assertion

## Comments
