# 01 — Pipeline bootstrap: branches + planning docs committed

**What to build:** The promotion pipeline's branch structure exists and the story's planning docs are on the feature branch. Create `dev` and `preprod` from current `main`; create `feature/S0.1-repo-and-standing-rules` off `dev`; commit the planning docs from the grilling session (the spec, the 06b §7 JUnit amendment, the epic-map/BUILD_STATUS gate entries, the S0.1 tickets) as its first commit, following the commit convention (`feat(skeleton): S0.1 …`, story id mandatory, no agent signature).

**Blocked by:** None — can start immediately.

**Status:** done

- [x] `git branch` shows `main`, `dev`, `preprod`, `feature/S0.1-repo-and-standing-rules`; `dev` and `preprod` point at the same commit as `main` at creation time
- [x] The planning docs are committed on the feature branch with a convention-conforming message
- [x] No promotion is performed — everything stays on the feature branch

## Comments

**2026-07-15 — implemented.** Branches created from `main` at `e7e8b23`; planning docs committed on the feature branch as `2c7a5bb` (`feat(skeleton): S0.1 spec, tickets, and pipeline branch structure`). Verified: `dev` 0 commits ahead of `main`, feature 1 ahead of `dev`, nothing pushed to origin.

**Finding for ticket 07 (secret hook) — the docs are full of trigger words; verified empirically.** The manual staged-diff scan on this commit produced two hits, both false positives: the spec and ticket 07 itself contain the literal strings `API_KEY=`, `SECRET`, `PASSWORD=` while *describing the pattern list*. Reproduced in a scratch repo against ticket 07's own file: a bare-keyword grep (`grep -qE "API_KEY=|SECRET|PASSWORD="`) **blocks the commit**; a value-aware grep requiring an assignment followed by a real token (`(API_KEY|PASSWORD|SECRET)[[:space:]]*=[[:space:]]*['\"]?[A-Za-z0-9_/+.-]{8,}`) **passes**. So the hook must match assignments-with-a-value, not bare keywords — otherwise it cries wolf on this story's own documentation and trains the user toward `--no-verify`, which destroys the backstop. The value-aware pattern above is a starting point, not a finished answer: 07 still owns tuning it (placeholder exclusion for `.env.example`, private-key headers, entropy rule).

**CRLF: checked and NOT an issue — don't act on it.** Git warns `LF will be replaced by CRLF` on every file (Windows, no `.gitattributes`), which suggested `.githooks/pre-commit` might fail with a `bad interpreter` error. Tested it: a shell script with CRLF line endings **executes fine** under Git-for-Windows' bundled sh. (The `bad interpreter` failure is a Linux/WSL behaviour, not Git-Bash.) Recorded so ticket 07 doesn't add a `.gitattributes` for a problem this repo doesn't have. If the hook is ever run from WSL or a Linux CI runner, revisit.
