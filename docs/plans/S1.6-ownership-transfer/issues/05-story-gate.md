# 05 — Story gate

**What to build:** nothing new — the story closed on evidence, at the layers that ship. The three rungs walked, the tracker updated before the merge, anything raised mid-story routed to its one home.

1. **Device AC (dev build, two pool accounts, tags stated in the write-up — t1 = original owner, t2 = offeree):** t1 offers → **t2's trip screen shows the banner** (the discovery claim gets its own on-glass assertion — it is the reversal's justification) → t2 accepts through the confirm → crown moves on both rosters → **both** My Trips keep the trip → t1's own row now shows Leave → **t1 leaves**. The S1.5 dead end (`OWNER_CANNOT_LEAVE`) proven open end-to-end. (Spec AC 12.)
2. **Web preview container (true build path):** `drive-preview.js` — as t1, drive the offer with the confirm intercepted, cancel first (roster unchanged) then confirm (badge appears); as t2, drive accept the same double way. A confirm that ignores "no" is worse than none. (Spec AC 13.)
3. **Deployed-dev probe, post-merge:** one offer → accept loop between pool accounts on deployed dev. The SQL check **names the `railway` database** (S1.1's rule — a null result from an unnamed database is not an answer) and reads three discriminating facts: offer row `accepted`, `ownership_transfer` row present, membership roles swapped. State what failure would look like before running it. (Spec AC 14.)
4. **Tracker discipline:** BUILD_STATUS row → ✅ with the spec link, **in the last commit on the feature branch, before the merge** · regression checklist reviewed — any bug that escaped to a human during this story adds its line · epic-map sweep: anything raised mid-story that outlives it gets its backlog line (candidates from the spec: none open — the claim flow and `kind` column are already recorded at S5.5).
5. **Full suites green** on the local stack before proposing the squash-merge: backend ITs, mobile Jest, clean `tsc`. The merge itself is propose-first, as every promotion is.

**Blocked by:** 01, 02, 03, 04 — the whole story.

**Status:** ready-for-agent

- [ ] Device walk complete as scripted, tags stated, screenshots + backend-log evidence captured (spec AC 12)
- [ ] Preview container driven both roles, cancel + confirm each, via CDP (spec AC 13)
- [ ] Deployed-dev probe: offer `accepted` + transfer row + roles swapped, database named in the query (spec AC 14)
- [ ] BUILD_STATUS + regression checklist + epic-map sweep done in the last feature-branch commit
- [ ] Full backend + mobile suites green; squash-merge to dev proposed, not executed
