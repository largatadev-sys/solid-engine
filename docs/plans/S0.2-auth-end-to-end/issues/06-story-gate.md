# 06 — Story gate

**What to build:** Nothing new — the closing checkpoint. The canonical path from a clean state: full `docker compose up --build` gate, CI green on the feature branch, every ticket's ACs ticked with evidence, the trackers truthful, and the promotion proposed — **not executed** (promotions are propose-first, per CLAUDE.md).

**Blocked by:** 01, 02, 03, 04, 05.

**Status:** ready-for-agent

- [ ] Full `docker compose up --build` from scratch passes the per-story verification gate
- [ ] CI green on `feature/S0.2-auth-end-to-end` (all three jobs; mobile job green without `google-services.json`)
- [ ] Every S0.2 ticket's ACs ticked with evidence; S0.1 ticket 05's carried ACs confirmed closed
- [ ] BUILD_STATUS row updated: S0.2 status + plan link; anything raised mid-story captured in the epic map backlog
- [ ] Artifact 05's 401 amendment verified present; spec deviations (if any) appended to spec Comments, not edited in
- [ ] Squash-merge `feature/S0.2-auth-end-to-end` → `dev` **proposed to the owner, then stop and wait**
