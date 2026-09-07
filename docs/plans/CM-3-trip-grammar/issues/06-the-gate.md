# 06: The gate

**What to build:** the story proven at the layer that ships and proposed for merge. The full backend suite with its counts read from the log; Playwright in both lanes on the preview container with the total read first; the walk on the LAN rung with `t1 = owner, t2 = member` — create, a day and an activity under the editing session, save, cover, invite by handle, accept, chat, a poll and a vote, a join link, archive and unarchive, publish and unpublish — with the backend log read for `/v1/trips` requests and for nothing on the old root except the published-page read and the old diary paths; the discriminating checks the spec names; the pull request opened as the proposal and never merged unasked.

**Blocked by:** 05 (The contract doc and the tracker).

**Status:** ready-for-agent

- [ ] Backend unit and integration counts read from the log, not the exit code, and stated in the pull request with the number of old-root tests that passed without an edited assertion
- [ ] Playwright both lanes green with the list total read first
- [ ] The LAN walk closed by the founder, each act recorded with which pool account played which role
- [ ] The discriminating checks pass: two requests on both roots diffed byte for byte; the preview bundle names the new root and names the old root only for the published-page read and the diary; a publish through the app leaves one itinerary object; the migration history's head is unchanged
- [ ] The pull request is opened against `dev` as the proposal, with the PR body carrying no agent attribution

## Comments

**Amended before merge (2026-09-07):** AC4's *"a publish through the app leaves one itinerary object"* no longer applies — the client's publish deferred to CM-5 (see ticket 03's amendment), so a publish through the app flips the flag and mints nothing. The invariant itself is unchanged and still proven, by `PublicationContractIT` and by a live walk, on the route the app will call at CM-5.

**Gate evidence (2026-09-07).** CI green on every check: **414 unit + 1,367 integration**, every pre-existing old-root test passing with no edited assertion; **202 Jest suites / 6,857 tests**; Playwright's api and web lanes green in CI against a fresh stack. Locally: API lane 366/366, publish and unpublish web specs 31/31 on a fresh database. Discriminating check on the shipping artifact: the preview bundle names `/v1/trips` 49 times, the old root 10 (seven diary paths, fork, and the two publish acts), and zero trips-rooted publish calls.

**Left open:** the device/LAN walk — the recorded Gradle fault still blocks device builds. No screens changed, so the surface it would cover is unaltered. Several web walks fail only under full-lane contention or against accumulated fixtures and pass in isolation on a fresh stack; CLAUDE.md's seeding entry gained that lane.
