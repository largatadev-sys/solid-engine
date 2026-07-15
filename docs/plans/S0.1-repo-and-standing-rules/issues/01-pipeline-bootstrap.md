# 01 — Pipeline bootstrap: branches + planning docs committed

**What to build:** The promotion pipeline's branch structure exists and the story's planning docs are on the feature branch. Create `dev` and `preprod` from current `main`; create `feature/S0.1-repo-and-standing-rules` off `dev`; commit the planning docs from the grilling session (the spec, the 06b §7 JUnit amendment, the epic-map/BUILD_STATUS gate entries, the S0.1 tickets) as its first commit, following the commit convention (`feat(skeleton): S0.1 …`, story id mandatory, no agent signature).

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `git branch` shows `main`, `dev`, `preprod`, `feature/S0.1-repo-and-standing-rules`; `dev` and `preprod` point at the same commit as `main` at creation time
- [ ] The planning docs are committed on the feature branch with a convention-conforming message
- [ ] No promotion is performed — everything stays on the feature branch

## Comments
