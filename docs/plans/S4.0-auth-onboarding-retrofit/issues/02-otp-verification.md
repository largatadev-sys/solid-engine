# 02 — OTP verification end-to-end

**Status:** ready-for-agent

**What to build:** a traveler signing up with email verifies by typing a 6-digit code from their inbox, on the code-boxes screen the wireframe shows — replacing the Firebase link mechanism at sign-up. The backend issues, mails (Resend), and confirms the code, flipping `email_verified` through the Admin SDK seam; the client refreshes its token and proceeds. Google sign-ups never see the screen. The console work (Resend account, sending-domain DNS, per-rung keys, Admin SDK service account) is part of this ticket — do the DNS first, propagation is not instant.

**Blocked by:** 01 — palette + front-door restructure (the screen shell and the flow insertion point).

- [ ] Email sign-up: code issued and mailed; correct code → `email_verified` true after token refresh → flow proceeds (spec AC 1)
- [ ] Wrong code, attempt cap, expiry, and resend-inside-cooldown each refuse with a typed error (spec AC 2)
- [ ] Codes stored hashed; absent from logs when the real mailer runs; the keyless logging sink stands in locally and prints the mail to the backend log (spec decision 2)
- [ ] Single active code per traveler; a fresh send invalidates the prior code
- [ ] The Admin SDK dependency lives behind a one-class seam ("flip `email_verified` for uid"); its credential is env-var only — never committed (spec, backend scope)
- [ ] The old verify-email screen is replaced; no inbox-reachable verification path remains (the unreachable-screen discharge, spec decision 2)
- [ ] Google sign-in skips verification entirely, on device and web (spec decision 3)
- [ ] Invite-accept gate untouched: the existing verified-email ITs stay green without modification
