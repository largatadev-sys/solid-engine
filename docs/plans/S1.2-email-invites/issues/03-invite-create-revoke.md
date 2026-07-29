# 03 — InvitationService: create + revoke + pending list (the owner side)

**Status:** done (2026-07-22)

**What to build:** the owner-side service methods, taking the guard's resolved `Membership` per the hard rule (workspace-scoped service methods take `Membership` as a parameter; no inline authority checks).

1. **Create:** requires `membership.role == OWNER` (role authority in the service — *not* the entitlement seam, spec §owner-issued). Normalize email → reject `ALREADY_A_MEMBER` (invited address matches an existing member's traveler email via the identity service interface, by ID — ADR-002) → reject `INVITATION_ALREADY_PENDING` (or surface at the index; either way the 409 code is the contract) → insert `PENDING` with `invited_by`, `expires_at` → mailer dispatch post-commit (ticket 02).
2. **Revoke:** owner-only; `PENDING → REVOKED` + `resolved_at`; non-pending → `ILLEGAL_TRANSITION` (409).
3. **Pending list for a workspace:** any member reads (INV-1: workspace-walled ⇒ member-visible); returns pending invitations only, newest first.
4. Best-effort caveat, recorded: already-member detection compares against traveler-email snapshots — a member whose current email differs from their snapshot can be re-invited; harmless (accept then hits the `UNIQUE (workspace_id, traveler_id)` wall) and not worth chasing in alpha.

**Blocked by:** 01, 02

- [ ] Create with the three-step rejection ladder + dispatch
- [ ] Revoke + transition rules
- [ ] Member-visible pending list
- [ ] ITs: owner/member/non-member authority matrix · both 409s · revoke transitions
