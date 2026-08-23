# 01 — Sign-out drops the previous traveler's cache

**What to build:** signing out, or signing in as a different traveler, leaves nothing of the previous traveler behind. Today `meKeys.me` is the constant `['me']` and nothing clears the query client, so the next sign-in can be routed on the previous traveler's profile — including into an onboarding flow that is not theirs.

This is the prefactor. Every later ticket changes what the gate decides, and none of them is observable while the gate can be handed the wrong traveler's answer.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Signing out empties the query cache, so no cached response outlives the session that fetched it — `me` is the one that routes, but none of the others should survive either.
- [ ] The drop is keyed on the authenticated identity changing, not on a sign-out button, so an account switch with no explicit sign-out is covered by the same rule.
- [ ] Signing back in as the *same* traveler is not penalised beyond one refetch.
- [ ] Verified on a device or the preview, not in Jest: the failure mode is cross-account bleed, which only exists once two sign-ins share a process. Sign in as `t1`, sign out, sign in as `t2`, and confirm `t2` is never routed on `t1`'s profile.
