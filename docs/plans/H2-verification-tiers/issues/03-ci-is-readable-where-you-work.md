# 03 — CI is readable where the work happens

**What to build:** The signal reaches a human. `gh` is already installed (`~/tools/gh/bin/gh.exe`, user-scope zip — `winget` needs admin and stalls an agent shell on UAC), authenticating by reusing the stored git credential rather than a browser flow. What is missing is somewhere the founder actually looks.

**Blocked by:** nothing — parallel with 01.

**Status:** ready-for-agent

- [ ] The **GitHub Actions VS Code extension** installed and confirmed showing runs per branch with failure logs inline
- [ ] **Email is explicitly not a signal — the founder does not read it** (decision 15). Do not design any part of this around a mailbox
- [ ] Nothing custom is built. Protection (ticket 02) is the real answer: a red then blocks the merge button, which is unmissable at the moment it matters. Pre-PR feature-branch reds are informational
- [ ] The `gh` recipe lands in CLAUDE.md beside the other verification commands: how to read a run, how to read a failure, and the one-line statement that **the backend ITs, Jest and the typecheck are CI's job**. Include the credential handoff, because a browser login is not available to an agent and PowerShell 5.1 mangles the newlines `git credential fill` needs
- [ ] **Read the `Tests run:` counts from the log, never the conclusion alone** — the rule survives the move to CI; it is only the *invocation* that changed
