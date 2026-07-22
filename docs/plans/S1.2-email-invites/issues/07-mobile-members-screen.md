# 07 — Mobile: the Members screen (owner sends, everyone sees)

**Status:** done (2026-07-22)

**What to build:** the owner-side client — the first screen where a workspace's *people* are visible.

1. **Members screen** reachable from the trip view: member list (`displayName`, role badge, `joinedAt`) for every member.
2. **Owner extras** (role from the member-list response): "Invite by email" — one field, client-side trim + lowercase, submit → optimistic pending-list refresh; the pending-invitations list (address, sent date, Revoke); revoke → confirm → gone. 409 codes surface as inline messages ("already a member", "already invited").
3. Non-owners see the list only — no invite affordances rendered (server enforces regardless; the UI just doesn't advertise dead ends).
4. Repository additions: owner-side methods (create/revoke/pending list, member list) on the same typed layer as ticket 06.

**Blocked by:** 05, 06

- [ ] Members screen + navigation entry from trip view
- [ ] Owner invite field + pending list + revoke, with 409 handling
- [ ] Jest for the owner-side repository methods
