# 06: The gate

**What to build:** the story proven the way a behaviour-preserving refactor is proven — by what did not move. The full suite runs with its counts read from the log rather than the exit code, and the number that matters is how many existing tests changed an assertion: it must be **zero**. Import lines moving is expected; an edited assertion means behaviour changed and the story is wrong. No new functional test is written, and if one seems necessary that is the signal something behavioural crept in.

The gate also reads what no test can: that each minted interface carries only methods a caller invokes rather than a mirror of the service behind it, since an interface that publishes everything has moved the boundary rather than drawn it. The pull request is opened as the proposal and never merged unasked.

**Blocked by:** 05 (The record).

**Status:** ready-for-agent

- [ ] Backend unit and integration counts read from the log, stated in the pull request, with the number of pre-existing tests whose assertions changed stated as zero
- [ ] The client suites and type-check pass; no client file changed, and the pull request says so
- [ ] Each minted interface is read against its call sites and confirmed to carry no method nobody calls
- [ ] The guards and the meta-test are green, and their sabotage runs are recorded on their own tickets with the failure lines read
- [ ] No migration shipped, no endpoint changed, no screen changed — checked, not assumed
- [ ] The pull request is opened against the shared branch as the proposal, with the body carrying no agent attribution

## Comments
