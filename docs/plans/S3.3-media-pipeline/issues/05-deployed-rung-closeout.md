# 05 — Deployed bucket, drivers, smoke, close-out

**What to build:** the story leaves the laptop — the deployed-dev bucket provisioned with the recorded conditional executed for real, the verification rungs closed across all four surfaces, and the story's bookkeeping done (spec decisions 6, 12; ACs 11–14).

**Blocked by:** 04 — activity photos + the gallery (every surface must exist to be verified).

**Status:** ready-for-agent

- [ ] The decision-6 conditional executed: the Railway bucket-region dropdown checked at creation — an Asia region offered → Railway Buckets; none → Cloudflare R2 with the `apac` hint (the recorded fallback, no new decision) — and the outcome appended to the spec's `## Comments`.
- [ ] Deployed-dev env vars wired through the platform UI — no secret touches a committed file (the structural rule).
- [ ] The API smoke script covers upload/read/ladder across all four surfaces against the fresh local stack; the preview drive script covers avatar, cover, activity photos and the gallery — including a real web file upload via the CDP file-chooser path from ticket 02.
- [ ] The emulator walk closes the device ACs end-to-end (avatar → cover → activity photos → gallery), on pool identities with roles stated (`t1 = owner, t2 = member` style — the self-identifying-fixtures rule).
- [ ] AC 14 held: the whole story's diff carries zero entitlement code — no tier branch, no `can(`, greppable and clean.
- [ ] BUILD_STATUS row updated — status + spec link, nothing else — in the last commit on the feature branch (never after the merge).
- [ ] Recorded here, executed at the promotion: the post-merge deployed-dev probe (upload + read against deployed dev, environment named, a discriminating signal stated before trusting it — the S1.1 rule). The S4.13 precedent: the probe belongs to the promotion, not the branch.

## Comments
