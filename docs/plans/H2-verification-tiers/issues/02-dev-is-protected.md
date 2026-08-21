# 02 — `dev` is protected, and CI green stops being a habit

**What to build:** Branch protection on `dev`: required pull request, the aggregator as the one required check, administrators **included**. This is the ticket the story exists for — `dev` sat red for thirteen consecutive pushes because nothing enforced anything.

**Blocked by:** nothing any more — **done 2026-08-22, ahead of 01, at the founder's request.**

**Status:** ready-for-agent — the protection is live; what remains is the documentation and the hand-off to the other agent.

**How it differs from the plan:** protection was applied against the **three current job names**, not the `ci` aggregator, because the aggregator does not exist yet. That is correct today and **becomes the pending-forever trap the instant ticket 01 lands path filters** — ticket 01 now carries the obligation to swap the contexts in the same change.

- [x] Required PR (0 approvals — the founder is the author, so requiring one would deadlock) + required status checks + `enforce_admins: true`. **No exemption** — an admin bypass recreates exactly the discipline gap being closed (decision 9). Force pushes and deletions disabled
- [x] **Proven by a refusal**, not asserted: a direct push to `dev` returned `GH006: Protected branch update failed … Changes must be made through a pull request … 3 of 3 required status checks are expected`. The probe commit was reset locally; nothing landed
- [ ] `preprod` and `main` are **left alone in this ticket** — they get required checks and **no required PR** at the gate ticket, after the `dev → preprod` promotion. GitHub's PR merge has no true fast-forward, so requiring one there would mint a different SHA and destroy `git rev-parse main preprod` (decision 9)
- [ ] **Turn it on at a quiet moment and tell the other agent.** Several agents share this checkout and commit to `dev` routinely; flipping protection mid-session breaks them with a push rejection that names nothing (decision 10)
- [ ] CLAUDE.md's git-workflow section states the new mechanic: `feature → dev` is a PR, squash-merged, gated on `ci`. It already forbids direct `dev` commits at line 39 — this enforces the existing rule, so amend that line rather than adding a second one
