# 07 — Secret hook + hygiene: the blocked-commit guarantee

**What to build:** A commit whose staged diff contains a secret is refused. A tracked `.githooks/pre-commit` shell script (activated per clone via `git config core.hooksPath .githooks`; Git for Windows runs sh hooks) greps the staged diff for the CLAUDE.md pattern list — `API_KEY=`, `SECRET`, `PASSWORD=`, private-key headers, long high-entropy strings, and any staged `.env` file — and exits non-zero on a match. No gitleaks, no third-party scanner (founder decision). Plus the hygiene items: `.gitignore` gains the Java entries (`target/`, `*.class`, `hs_err_pid*`), and the pointer README lands — one sentence of what-this-is, the bootstrap commands (hook activation, `docker compose up`, where the app runs), a pointer to CLAUDE.md and `docs/design/` — no narrative.

**Blocked by:** 04 — Composed stack *(only so the README's run commands are real; the hook itself has no dependency)*.

**Status:** done

- [x] Planted fake secret staged → commit refused with a message naming the match
- [x] Staging any `.env` file → commit refused
- [x] A normal commit passes the hook silently
- [x] Known limits (unconfigured clone, `--no-verify`) noted in Comments — gitignore remains the primary defence by design
- [x] `.gitignore` covers Maven build output; a full backend build leaves `git status` clean
- [x] README contains only runnable instructions and pointers; hook activation is one of them

## Comments

**2026-07-15 — implemented. Three tests run against the live hook:**

1. **Planted fake secret → BLOCKED.** Staged an `API_KEY = "<a Stripe-style live key>"` assignment in a `.js` file; commit refused, message named the matching line. *(The literal string is not reproduced here — see the note below.)*
2. **Staged `.env` → BLOCKED.** Refused with "staged env file(s)".
3. **The repo's own docs → PASS.** This is the one that matters — see below.

**Ticket 01's finding, confirmed and fixed.** The spec/tickets/hook all contain the literal strings `API_KEY=`, `SECRET`, `PASSWORD=` while *describing the pattern list*. Reproduced in a scratch repo: a bare-keyword grep **blocks this very ticket file**; a value-aware pattern (assignment + a real, non-placeholder token) passes it. So the hook matches assignments-with-a-value, plus unambiguous formats (PEM headers, `AKIA…`, `ghp_…`, `sk_live_…`, `AIza…`) with no placeholder exemption. Had it stayed keyword-based it would have refused commits to the documentation explaining the rule — training everyone toward `--no-verify` and hollowing the backstop out entirely.

**Known limits, accepted by design (the AC's own requirement to record them):**
- **A fresh clone has no hook** until someone runs `git config core.hooksPath .githooks`. Git will not do this automatically — hooks are deliberately not transferable by clone, precisely so a repo cannot execute code on checkout. Mitigation is discoverability: it is the first command in the README.
- **`--no-verify` bypasses it.** Unavoidable for any hook.
- Both are why **CLAUDE.md is right that the gitignore is the real defence**: it makes secret files unstageable, which depends on nobody remembering anything. This hook only covers the case gitignore cannot — a credential pasted inline into a source file.

**The hook's first real firing was on this very file — and it was right.** An earlier draft of these Comments quoted the fake Stripe-style key verbatim as evidence, and the hook refused the commit. The tempting fix was to widen the placeholder list to exempt it; that would have taught the pattern list to ignore a real key format, which is precisely backwards. The correct fix was on the author's side: describe the fixture, don't paste it. **Standing lesson: when this hook fires, the default assumption is that the hook is right.** Widen the placeholders only when the match is genuinely inert prose (e.g. the word `SECRET` in a sentence), never when it is a credential-shaped literal.

**CRLF: checked, not an issue.** Ticket 01 flagged a possible `bad interpreter` failure from CRLF line endings. Tested: Git-for-Windows' bundled `sh` runs CRLF scripts fine (that failure is Linux/WSL behaviour). No `.gitattributes` added. Revisit only if the hook ever runs from WSL.

**Note:** the `.gitignore` Java entries landed early, in `9d7d63d` — the first backend build staged `backend/target/`, so the gap had to close before that commit rather than waiting for this ticket.
