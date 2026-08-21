# 02 — `dev` is protected, and CI green stops being a habit

**What to build:** Branch protection on `dev`: required pull request, the aggregator as the one required check, administrators **included**. This is the ticket the story exists for — `dev` sat red for thirteen consecutive pushes because nothing enforced anything.

**Blocked by:** 01 — the aggregator must exist and be proven against a skip first.

**Status:** needs-triage

- [ ] Required PR + required status check (`ci`) + include administrators. **No exemption** — an admin bypass recreates exactly the discipline gap being closed (decision 9)
- [ ] **Proven by a refusal:** a knowingly-red commit cannot be merged; a green one can. State what the block looked like, rather than that it "should" work
- [ ] `preprod` and `main` are **left alone in this ticket** — they get required checks and **no required PR** at the gate ticket, after the `dev → preprod` promotion. GitHub's PR merge has no true fast-forward, so requiring one there would mint a different SHA and destroy `git rev-parse main preprod` (decision 9)
- [ ] **Turn it on at a quiet moment and tell the other agent.** Several agents share this checkout and commit to `dev` routinely; flipping protection mid-session breaks them with a push rejection that names nothing (decision 10)
- [ ] CLAUDE.md's git-workflow section states the new mechanic: `feature → dev` is a PR, squash-merged, gated on `ci`. It already forbids direct `dev` commits at line 39 — this enforces the existing rule, so amend that line rather than adding a second one
