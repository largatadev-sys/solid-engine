# 09 — Display-name step (email/password sign-ups only) — CUTTABLE

**Status:** cut → sign-up/onboarding reconciliation story (2026-07-22, at implementation)

**Cut, exercising the provision this ticket was written with.** The spec designated this the one cuttable ticket, and three facts made the cut the right call rather than a shortcut: (1) the backend already guarantees *a* display name at provisioning (the `name` claim, else the email local part — `TravelerClaims`), so the founder ruling "a display name exists at join" holds without this; cutting degrades name *quality* for email/password sign-ups, not the guarantee. (2) The insertion point is the problem: sign-up is driven by the auth-state listener in `AuthProvider`, which navigates to My Trips the instant the account exists — there is no seam for a prefilled step without restructuring that flow, and **that restructure is precisely what the backlogged sign-up/onboarding reconciliation story owns** (epic-map: "welcome polish, verify-waiting state, display-name screen, completion screen"). (3) Doing it here would either duplicate that restructure or ship a fragile half. The reconciliation story is the next story after S1.2, so the wait is short and the derived-name fallback covers the gap. The token-refresh-ordering pinning test moves there with it.

---

*(original ticket body, for the reconciliation story to pick up:)*

**Cuttable to the sign-up/onboarding reconciliation story (epic-map backlog) if the story runs long** — the derived-name fallback keeps the guarantee structurally true; cutting this degrades name quality only. Everything else in this story breaks the loop if cut; this doesn't (spec §slicing).

**What to build:** one prefilled screen in the email/password sign-up path; Google sign-ups never see it.

1. After `createUserWithEmailAndPassword`: show the step prefilled with the derived name (email local part); on continue → `updateProfile({displayName})` → **force token refresh** → only then the first backend call. Provisioning's existing `name`-claim path picks it up — zero backend change, no `PATCH /v1/me`.
2. **The ordering is the trap and gets the pinning test:** a skipped refresh provisions the Traveler with stale (nameless) claims and the fallback wins *silently* — the test must fail when the refresh is removed (the S1.1 sabotage discipline).
3. Web path: same step, `updateProfile` equivalent via the REST surface (`accounts:update` with `displayName`) — same static-env-read rules.

**Blocked by:** 08

- [ ] The step (native + web), prefilled, skippable-by-continue
- [ ] updateProfile → refresh → first-call ordering + its can-fail test
