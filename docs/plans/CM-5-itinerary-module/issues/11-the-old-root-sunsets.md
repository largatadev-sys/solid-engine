# 11: The old root sunsets

**What to build:** `/v1/itineraries/**` stops answering, except for the eight diary-entry routes now served from the postcard module. Every controller that declared both roots declares the trip's grammar alone; the five old-root lifecycle acts — publish, unpublish, fork, audience, finish-planning — and the old published projection root go; the twin test and the equivalence test retire, their job done. The refusal code for a missing trip on the new root flips to `TRIP_NOT_FOUND`, as ADR-037 planned, and the four places in the client that branch on it have handled both codes since CM-3. The object contracts and ADR-037's wire notes are annotated with the date.

**Blocked by:** 10 (The old package is deleted and `publication` takes its name).

**Status:** ready-for-agent

- [ ] Every mapping on the old root is gone except the eight diary-entry routes, which still answer; every controller declares the trip's grammar alone
- [ ] The five old-root lifecycle acts and the old published projection root answer as unmapped routes
- [ ] The twin test and the equivalence test are removed, with the reason in the commit message
- [ ] A missing trip on the new root answers `TRIP_NOT_FOUND`; the client's four guard tests assert the new code and still tolerate the old
- [ ] No end-to-end spec or script names the old root except the diary-entry paths; the Playwright list total is read
- [ ] The object contracts' wire table and ADR-037's decision (5) carry the sunset date and the diary-route exception
