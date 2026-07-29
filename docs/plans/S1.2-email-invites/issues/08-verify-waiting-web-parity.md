# 08 — Verify-email waiting state + the web `sendOobCode` parity gap

**Status:** done (2026-07-22)

**What to build:** the state a password-account invitee lands in when accept returns 403 `EMAIL_NOT_VERIFIED` — and the web-side call that makes it reachable at all on the preview.

1. **Waiting state:** "We sent a verification link to 〈email〉" + **Resend** (native: `sendEmailVerification()`; web: the new REST call) + **"I've verified"** → force token refresh → retry the accept. *Not* a 6-digit code screen — that Figma screen contradicts the shipped link mechanism and is backlogged with the reconciliation story.
2. **Web parity:** `firebaseWebRest.ts` gains `accounts:sendOobCode` (`requestType: VERIFY_EMAIL`) — without it a password account created on the preview can never verify, and therefore never accept (a knowingly-shipped dead end otherwise). Same file discipline as the existing doorways: direct static `EXPO_PUBLIC_*` reads only.
3. Token-refresh-then-retry is the load-bearing bit: the 403 clears only when a *fresh* token carries `email_verified: true`.

**Blocked by:** 06

- [ ] Waiting state + resend + refresh-retry loop
- [ ] `sendOobCode` in `firebaseWebRest.ts` + Jest
- [ ] Drive the loop once on the preview container (S0.5 rule)
