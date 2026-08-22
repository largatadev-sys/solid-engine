# 05 — Membership actions on the tab: menus, remove, leave, revoke, approve

**What to build:** the tab starts acting — the ⋯ menus (frame 3b, minus the transfer entries which arrive in 07), the remove/leave confirms (frames 4/5), Invited-row revoke, and the owner's Approve/Decline on request rows with the M3 motion.

**Blocked by:** 04 (the rows, the menu primitive) · 02 (Approve/Decline call the join module).

**Status:** ready-for-agent

- [ ] **⋯ renders per the permission matrix**: owner view — every non-owner row; member view — the viewer's own row only. 44px hit, M5 press.
- [ ] The ⋯ opens the bottom-sheet menu (title = the member's @handle): owner-on-member **[Remove from trip]** (destructive) · own row **[Leave trip]** (destructive). *(Transfer ownership / Revoke ownership offer entries are 07's — do not render a dead entry.)*
- [ ] **Remove** (owner only): platform alert with the exact copy ("They'll lose access to this trip. Their messages, votes, and photos stay."), destructive confirm; on confirm the row fades 150ms and the list closes the gap in the 200ms layout pass (M2), counts updating in the same pass; no undo, no toast, no group notification.
- [ ] **Leave** (own row): "Leave this trip?" / "Not yet" · Leave; on confirm, navigate back to Trips.
- [ ] **Revoke** on Invited rows — any member (the 01 policy), quiet text action, M2 exit; an emptied Invited header exits with its last row.
- [ ] **Approve / Decline** on request rows (owner only): approve = M2 out of Requests then M1 into Travelers — no bespoke move animation, no accent flash (M3); decline = M2, silent. Both wired to the join module's endpoints; errors surface honestly by named code.
- [ ] **Published variant**: no ⋯ anywhere except the viewer's own row (Leave). **Archived variant**: per the spec's flagged S1.9 tension, the recommendation is applied — the viewer's own row keeps ⋯ → Leave (the server allows it; this tab is the only leave door). *The founder may overrule at review; the canvas's no-Leave reading loses to S1.9 canon until they do.*
- [ ] Reduce Motion: M2's layout close snaps, M1/M3 entrances jump-cut; fades stay.
- [ ] Jest: menu-variant selection (role × row × offered × published × archived) · the M-guards. The mutation paths are proven by the existing hooks' tests plus 01/02's ITs — this ticket asserts the surface's behavior, not the wire again.
