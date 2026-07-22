# 01 — The `invitation` table, entity, and storage contract

**Status:** done (2026-07-22)

**What to build:** additive migration `V6__invitation.sql` + the workspace-module `Invitation` entity. No data migration — the table is born empty (spec §Deliberate omissions: no stepping IT needed).

1. **Schema:** `invitation(id, workspace_id FK, email TEXT (stored lowercased), status, invited_by, accepted_by NULL, created_at, expires_at, resolved_at NULL)`. Status values: `PENDING | ACCEPTED | DECLINED | REVOKED | EXPIRED` — `@Enumerated(STRING)` writes the **name**; no SQL default column dead weight (the V3 `'draft'` lesson).
2. **The one-pending rule, structural:** partial unique index `ON invitation (workspace_id, email) WHERE status = 'PENDING'`. The predicate's spelling is a Hibernate contract — **pin it** the way `MembershipStorageIT` pins the membership role spelling: a test that inserts via the entity and proves the index actually fires (a second pending for the same workspace+email violates), plus the sabotage check that a lower-case predicate would have matched zero rows.
3. **Email normalization happens before storage** (trim + casefold) so the index and every later comparison operate on one canonical form; the match at accept-time is then plain equality.
4. `expires_at = created_at + 14 days` — a constant in one place, not a contract.

**Blocked by:** —

- [ ] `V6__invitation.sql` — table + partial unique index + FK
- [ ] `Invitation` entity (package-private repo, workspace module — ADR-002)
- [ ] `InvitationStorageIT`: enum-spelling pin · one-pending index fires · normalization round-trip
