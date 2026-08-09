# 04 — Story gate: the three-rung walk with a live offer

**What to build:** The story's evidence, with the one path only two accounts can prove: the ownership-offer banner remaining the members screen's working door. Backend ITs green (the roster fields' IT rides ticket 01) · emulator and web-preview walks of the tab tags, a member's stub, the self-stub, and the email-less own profile · a **live offer between two pool travelers** driven end to end — offer, banner appears for the offeree, its link lands on the members screen, accept works (spec AC 4). BUILD_STATUS row updated in the last commit on the feature branch.

**Blocked by:** 01, 02, 03.

**Status:** ready-for-agent

- [ ] Backend ITs green, including the roster round-trip and the non-member refusal (spec AC 5).
- [ ] Emulator + web preview: owner-only tag · member stub · self-stub · own profile without email — screenshots, roles stated (t1 = owner, t2 = member) (spec ACs 1–3, 6).
- [ ] The offer path: t1 offers to t2, t2's banner deep-links into the members screen, accept completes; withdraw/decline spot-checked (spec AC 4).
- [ ] `largata://members/<id>` resolves on the emulator via the deep-link recipe.
- [ ] Zero anonymous `/v1` requests in the driver's list (the avatar rides the authenticated path).
- [ ] BUILD_STATUS row flipped in the final feature-branch commit; squash-merge to dev proposed, not executed.
