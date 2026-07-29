# 02 — `InvitationMailer` port + Resend adapter + logging adapter

**Status:** done (2026-07-22)

**What to build:** the repo's first outbound integration, behind a port so it stays commodity (spec §Email; P9: ports-and-adapters at an external boundary).

1. **Port:** `InvitationMailer.sendInvite(invitationId, …)` in the workspace module's vocabulary — callers never see Resend types.
2. **Resend adapter:** plain HTTP via Spring `RestClient` (no SDK dependency); sender `invites@largata.com`; template = short text/HTML "〈owner〉 invited you to 〈trip〉 on Largata — open the app" (pure notification, **no token, no link-with-secrets** — Q6). Never log recipient addresses or payloads; reference the invitation by ID (P3).
3. **Selection by key presence** (`RESEND_API_KEY`): absent → logging adapter (local stack, ITs); present → Resend (deployed `dev`). Same shape as `DevCorsConfig`. An IT pins that the logging adapter is what a keyless context gets.
4. **Send-after-commit, log-don't-retry:** dispatch happens after the invitation transaction commits (e.g. `@TransactionalEventListener(AFTER_COMMIT)` or an explicit post-commit call — pick the boring one and name it); a mailer failure must not fail the request or the row. IT: mailer throwing → invitation still `PENDING`, request still 201.

**Ops prerequisite (owner or propose-first):** Resend account · SPF/DKIM DNS records on `largata.com` · `RESEND_API_KEY` into Railway's `dev` env UI — never the repo (never-commit-secrets).

**Blocked by:** 01

- [ ] Port + logging adapter + key-presence wiring
- [ ] Resend adapter (RestClient), P3-clean logging
- [ ] Post-commit dispatch + failure-isolation IT
- [ ] DNS/account checklist handed to owner
