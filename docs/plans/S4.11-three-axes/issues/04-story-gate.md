# 04 — Story gate: verify across the rungs, reseed, record

**Status:** done

**What to build:** the story closes on evidence rather than on a green suite. The three axes are exercised where they ship — API over HTTP, the web preview container, and a device — and the demo data is reseeded to the new model so the next session opens on something honest (spec ACs 1–13).

**Blocked by:** 02, 03.

- [x] `smoke-publish.js` updated for three axes and passing: the gate refusal, the freeze, the pin, the one-step undo, `published + private` readable by a collaborator and masked for a stranger
- [x] `drive-publish.js` passing in a **rebuilt** preview container — rebuilt, because a stale container silently ignores unknown params and flatters every result (regression checklist #14)
- [x] Device walk closed with a screenshot actually opened and looked at, not just asserted on
- [x] `seed-demo.js` reseeds to the new model: trips spread across draft/active/complete, published and unpublished, public and private — including the `published + private` case the model newly allows
- [x] Mobile `tsc` clean and the Jest suite green
- [x] BUILD_STATUS row added (status + spec link, nothing else); REGRESSION_CHECKLIST gains any line a bug in this story earned
- [x] Epic map updated: the ADR-017 `completed`-gate line records its reversal; the friend-graph line records that `public` narrows rather than `friends_only` adding a tier
- [x] Staged diff scanned for secrets/PII before the commit
