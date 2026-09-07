# 04: The suites and scripts migrate

**What to build:** the new grammar is proven by the same walks the old one had. Every end-to-end file that speaks the old root, the seed helper the web lane seeds through, and the seven scripts that build fixtures and demo data move to the new root, so every walk and every reseed drives `/v1/trips`. The backend integration tests are left as the old root's proof until the itinerary story deletes it. The suite's total is read from the list command before the run, because a file that fails to load reports nothing, and both lanes are run against the preview container.

**Blocked by:** 03 (The client speaks trips).

**Status:** ready-for-agent

- [ ] No end-to-end file, seed helper or script names the old root except the published-page read and the old diary paths, checked by a search rather than by memory
- [ ] The list command's total matches the count before the migration plus nothing, proving no file dropped out of the suite
- [ ] The API lane and the web lane both pass on the preview container, with the counts read from the runner's summary
- [ ] A fresh reseed with the demo and travelers scripts succeeds against a fresh stack and the backend log shows the requests on the new root
- [ ] The old-root backend integration tests are untouched by this ticket

## Comments
