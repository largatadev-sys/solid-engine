# 05 — The walks: two travelers, four flows, and the regression line closes

**What to build:** the Playwright e2e coverage for everything the first four tickets shipped, against the preview container, with pool travelers playing named roles.

**Blocked by:** 01, 02, 03, 04.

**Status:** ready-for-agent

- [ ] **The follow walk** (state the tags: **t1 = follower, t2 = followed**): t1 follows t2 → pill flips to Following → both profiles' counts move → t2's view of t1 shows the **Follows-you** chip → t1 unfollows confirm-free → counts revert. The failure path drives a refused request and asserts the revert + the printed toast wording.
- [ ] **The lists walk:** stat cells open the lists on both the own tab and the public profile; a row tap lands on that traveler's profile; empty states render the frame-1c copy.
- [ ] **The Home filter walk:** All unchanged; Following shows only the followed traveler's postcards; the empty state renders with its Find people CTA reaching People search; cold start lands on All.
- [ ] **The executed-search walk — the one that graduates regression-checklist line 31 to ✅:** type a pool traveler's name, **submit**, and assert the person is on the resulting screen; assert "See all people" renders with a single match. Update line 31's guard column when it lands.
- [ ] Specs import copy from shared `.ts` modules only (the S4.28 Playwright-transform rule); verify with `npx playwright test --list` and read the `Total:` line.
- [ ] One full `npx jest` before any push that added a `src/` file (the S4.28 `--changedSince` blind spot).
