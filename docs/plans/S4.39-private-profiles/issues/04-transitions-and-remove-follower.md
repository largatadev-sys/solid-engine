# 04 — The transitions and remove-follower

**What to build:** the two flips behave as Instagram's do — going public approves every pending request in one act, going private keeps every follower — and any owner can remove any follower, silently, on a public or a private profile alike (spec decisions 6, 7 and 17).

**Blocked by:** 03.

**Status:** done

- [x] **Private → public**, through the same profile patch as ticket 01: in the same transaction every pending request against the flipping traveler goes `approved` with decided-at stamped and its edge is created. After commit: `follow_request_approved` and `follow_created` per row, `profile_visibility_changed` once. Nothing else about the requests is left behind — the inbox reads empty afterwards.
- [x] **Public → private:** no edge changes. Every existing follower still passes the read rule — asserted with a follower's reads before and after the flip, on the lists, the diary tab and a postcard's bytes.
- [x] **`DELETE /v1/me/followers/{travelerId}`** → `204`, idempotent; drops the edge if it exists; `follower_removed` after commit on an actual removal only; nothing reaches the removed traveler. Self: refused. Unknown or un-onboarded: 404 as the profile read. **Works on a public profile too.**
- [x] **After removal** the removed traveler's relation is `none`, they may follow (public owner) or request (private owner) again, and no pending request is created or touched by the removal itself.
- [x] **Counts follow:** followers and following on both profile reads reflect approvals and removals (they are computed at read time already — assert, do not denormalise).
- [x] **ITs as state tables:** (private, three pending) → public ⇒ three approved, three edges, three follower reads succeed; (public, two followers) → private ⇒ two followers remain and read, a stranger is refused; remove one ⇒ that one is refused and reads `none`, the other still reads. Sabotage-checked. Prior art: the S1.9 archive-transition ITs for the "state table" shape.
