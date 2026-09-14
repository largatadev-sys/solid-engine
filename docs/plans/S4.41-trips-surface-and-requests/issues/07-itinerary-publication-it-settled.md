# 07: `ItineraryPublicationIT` settled — the fifteen against the eight

**What to build:** the quarantine ledger shrinks by the row it could no longer explain. `ItineraryPublicationIT` — fifteen tests, disabled since CM-5 ticket 01 — was to be *"deleted, not repaired"* when ticket 11 sunset `/v1/itineraries/**`. Ticket 11 shipped on 2026-09-10 and the class is still there, because the row's condition never described it: measured at this story's grilling, it already calls `/v1/trips` and `/v1/me` — it was migrated to the trip grammar — so "delete it with the route" names a route it does not use. Its named successor, `PublishedMeansALiveItineraryIT`, holds eight tests. "Redundant" is therefore a claim to check, not assume: diff the fifteen against the eight case by case, delete what the successor genuinely covers, and repair or re-pin on the trip grammar what it does not. The row leaves when the class is gone or green (spec, Further Notes). This touches no product code and no other ticket's files.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A written diff, on this ticket, of the fifteen quarantined cases against the successor's eight: for each, *covered by* (which successor test) or *not covered* — no case marked covered by resemblance
- [ ] Every case the successor covers is deleted from the quarantined class; every case it does not is either repaired to assert the trip grammar's real contract or moved into the successor, and passes
- [ ] The `@Disabled` annotation is gone: the class is either deleted or green; no test in the tree carries a skip reason naming ticket 11
- [ ] The quarantine ledger row leaves BUILD_STATUS, and the reason it was stale — the exit condition fired and did not describe the class — is one line in the off-epic ledger's S4.41 entry, so the next stale row is recognised faster
- [ ] Unit suite and the scoped `itinerary` and `trip` ITs green locally; CI green on push

## Comments

*None yet.*
