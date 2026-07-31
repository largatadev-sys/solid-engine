# 06 — Story gate

**Status:** ready-for-agent

**What to build:** the whole story proven at the layers that ship, then the tracker brought current. The full walk on the device and the web preview container with pool accounts, roles stated: t1 = owner (publishes, unpublishes, archives), t2 = member, t3 = non-member consumer. The ladder walked end-to-end: private → t3 masked · published → t3 reads the projection by copied link · archived → t2 and t3 both masked, t1 retains · unarchive → both restored. The greyed-affordance sweep runs in the preview driver (three tabs, rating, fork count, Follow, cover — analytics firing, no dead clicks). The spec's ACs are cross-checked one by one; any deviation is appended to the spec's Comments, never silently absorbed.

**Blocked by:** 01, 02, 03, 04, 05.

- [ ] Device walk green: publish (preview → publish → success) → consumer view → unpublish → republish → archive → unarchive, all three pool roles exercised and stated
- [ ] Preview-container walk green via the preview driver, including the greyed sweep — page text present, zero console/page errors
- [ ] Post-merge probe on deployed `dev`: one publish → consumer-view → unpublish loop via pool accounts; the SQL check **names the `railway` database** and reads `visibility` flipping both ways (spec AC 12)
- [ ] Every spec AC (1–12) checked against the shipped behaviour; deviations recorded in the spec's `## Comments`
- [ ] Regression checklist gains the publish walk line(s)
- [ ] BUILD_STATUS row updated — status + spec link only — in the last commit on the feature branch, before the merge
