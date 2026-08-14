# 10 — The diagnostic CLI, re-engined

**What to build:** `drive-preview.js` rewritten on the Playwright library with its command-line contract intact — it is the instrument CLAUDE.md's debugging recipes cite by exact command, so the interface survives and only the engine changes. It remains a tool, not a test: it does not join the suite or its reporters.

**Blocked by:** 01 — Foundation + the discovery pilot.

**Status:** ready-for-agent

- [ ] Same invocation shape: a URL argument plus `--shot`, `--shot-steps`, `--width`, `--fresh`, `--upload label=path`, and the existing step/expectation vocabulary
- [ ] Same evidence bundle: full page text, console errors, page errors, Google iframe / One Tap presence, and every API request flagged bearer-vs-anonymous
- [ ] Alert and confirm dialogs are auto-accepted **with their wording printed** — evidence, never a silent yes
- [ ] The newest-OTP-from-backend-log helper still works, so sign-up flows stay walkable
- [ ] `--fresh` wipes only this tool's own profile, and the help/summary text says so
- [ ] No CDP or raw-WebSocket code remains in the tool; it no longer imports `ws`
