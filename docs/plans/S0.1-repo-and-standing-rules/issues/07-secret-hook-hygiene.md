# 07 — Secret hook + hygiene: the blocked-commit guarantee

**What to build:** A commit whose staged diff contains a secret is refused. A tracked `.githooks/pre-commit` shell script (activated per clone via `git config core.hooksPath .githooks`; Git for Windows runs sh hooks) greps the staged diff for the CLAUDE.md pattern list — `API_KEY=`, `SECRET`, `PASSWORD=`, private-key headers, long high-entropy strings, and any staged `.env` file — and exits non-zero on a match. No gitleaks, no third-party scanner (founder decision). Plus the hygiene items: `.gitignore` gains the Java entries (`target/`, `*.class`, `hs_err_pid*`), and the pointer README lands — one sentence of what-this-is, the bootstrap commands (hook activation, `docker compose up`, where the app runs), a pointer to CLAUDE.md and `docs/design/` — no narrative.

**Blocked by:** 04 — Composed stack *(only so the README's run commands are real; the hook itself has no dependency)*.

**Status:** ready-for-agent

- [ ] Planted fake secret staged → commit refused with a message naming the match
- [ ] Staging any `.env` file → commit refused
- [ ] A normal commit passes the hook silently
- [ ] Known limits (unconfigured clone, `--no-verify`) noted in Comments — gitignore remains the primary defence by design
- [ ] `.gitignore` covers Maven build output; a full backend build leaves `git status` clean
- [ ] README contains only runnable instructions and pointers; hook activation is one of them

## Comments
