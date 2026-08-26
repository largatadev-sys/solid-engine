# 06 — Story gate

**What to build:** the story's closing pass — the multi-account walks that prove the feature as travelers meet it, the suites read from CI, and the docs pass that discharges what this story owed. The device walk is **deferred by founder call** (2026-08-25, at the seam check) and is deliberately not part of this gate.

**Blocked by:** 02, 03, 04, 05.

**Status:** closed

- [ ] The profile walk runs with two pool travelers — state which tag played which role (t1 = viewer, t2 = subject) — covering: the full projection, the self-redirect (own byline → own Profile tab, per the 2026-08-25 re-ruling), the empty profile reachable from search, and the Follow prompt.
- [ ] The fences walk proves the enumeration posture end to end: short query yields nothing, email query yields nothing, results paginate.
- [ ] CI green on the branch — read the `Tests run:` counts, never the conclusion alone; the full local Jest runs once because this story adds files under the mobile source tree (the structural-guards rule).
- [ ] Docs pass, in the last commits on the feature branch: the BUILD_STATUS row reaches its final state; the epic map's discharged lines are amended (the stub must-answer for this surface, the vanity number's public rendering, S4.3's People refusals); the spec's status updates.
- [ ] The PR to `dev` is refreshed as the promotion proposal — opened, never merged unasked.

## Comments

*(none yet)*

**2026-08-26 — the gate's result, and the one failure that is not this story's.**

CI on the PR, after two rounds of fixes: **Playwright 760 passed, 1 failed**; backend **1045/1045**; mobile Jest **4985/4985**; typecheck and the compose-stack smoke green. The push-triggered run (everything but Playwright, which only fires on `pull_request`) is fully green.

**The single remaining failure is `e2e/web/live-travelers.spec.ts:56` — S4.35's socket spec, and it pre-dates this branch.** Not assumed: the CI run at **`fb73bd7`**, this branch's point before a line of S4.36 code, already failed the same spec (2 failed / 738 passed there). This branch touches no `ws/`, no live-travelers surface, and no Travelers tab file. S4.35 is still 🔄 in BUILD_STATUS and its own gate owns it.

**What the first Playwright run cost, recorded so the next story does not repeat it.** Four failures came back, and **none was the product**. Two were pre-existing specs still asserting the refusals ticket 05 deletes — the e2e twins of three Jest tests already updated, missed because **Jest is the only suite runnable locally on this workstation**, so "green locally" never covered the rung that matters most for a UI story. Two were this story's own new sweep, wrong against a working screen: `getByText('Profile')` also matches the **tab bar's** Profile label, so an "absent" assertion checked count 0 against a locator that resolves to 2 and could never pass; and the sweep entered at `/discover`, whose rails are recommended/trending, with nothing guaranteeing the seeded author's card was on them. **The generalisation: when a walk fails, ask what the harness did before reading the component** — and treat a UI story's local run as incomplete until CI's Playwright job has spoken.
