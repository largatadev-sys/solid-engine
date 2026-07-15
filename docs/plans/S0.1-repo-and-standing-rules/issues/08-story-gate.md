# 08 — Story gate: full verification + proposed promotion

**What to build:** The story's mandatory verification gate, run end-to-end, and the promotion proposed. From a clean state: `docker compose down && docker compose up --build`, then walk every AC in the spec's proof map (health through the composed stack, error contract, CI green, hook blocking, fresh-DB semantics). Flip S0.1's BUILD_STATUS row to ✅. Then **propose** the squash-merge of `feature/S0.1-repo-and-standing-rules` into `dev` and stop — promotions are propose-first per CLAUDE.md; the merge is the owner's checkpoint, never executed autonomously.

**Blocked by:** 06 — CI · 07 — Secret hook + hygiene.

**Status:** ready-for-agent

- [ ] Full gate run from clean state passes; every spec proof-map AC checked off with evidence in Comments
- [ ] BUILD_STATUS: S0.1 → ✅ (plan link already present)
- [ ] Squash-merge into `dev` proposed with a summary of what rides it — and not executed
- [ ] Anything surfaced during the story that outlives it has been captured in the epic map backlog, not left in ticket comments

## Comments
