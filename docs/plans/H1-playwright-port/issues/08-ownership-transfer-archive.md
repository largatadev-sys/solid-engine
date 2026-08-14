# 08 — Ownership transfer and archive posture

**What to build:** The living `drive-ownership-transfer` and `drive-archive` walks ported. Both are multi-identity: transfer runs the offer/accept consent flow between two travelers (exclusive identities — they mutate traveler-level relations); archive proves the mask from both sides of it.

**Blocked by:** 01 — Foundation + the discovery pilot.

**Status:** ready-for-agent

- [ ] The transfer spec covers what its walk covered: offer, the banner on the receiving side, accept, roles swapped — driven as two signed-in travelers
- [ ] The transfer identities are reserved exclusively in the map — no other spec file may borrow them
- [ ] The archive spec covers what its walk covered: the archive act, the frozen posture, unarchive — and the mask's two faces (a non-owner member reads not-found; the owner reads the honest state)
- [ ] Both specs seed their own trips; repeated runs converge (a transfer flips back, an archive unarchives) so the pool's state never drifts
- [ ] `drive-ownership-transfer.js` and `drive-archive.js` are deleted
