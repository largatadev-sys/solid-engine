# 06 — The add sheet + link share; the old doors close

**What to build:** frames 2/2b — the pinned **Add traveler** bar and the v1 sheet (exact-handle lookup, direct Invite, the no-results pivot, the share-link row through the platform share sheet) — and the deletions that complete the founder's original ask: the old invite screen and the editor header's "Invite Traveler" action are gone.

**Blocked by:** 02 (the link to share) · 04 (the tab and the sheet primitive). *(Not 05 — the sheet needs no menus.)*

**Status:** ready-for-agent

- [ ] The **pinned add bar**: single full-width accent CTA, never a list row; rises last in the M6 cascade (200ms ease-out, ~240ms in). Present for every member; absent on published and archived trips.
- [ ] The **v1 sheet** on the bottom-sheet primitive: title "Add traveler" · search field ("Search by @handle") driving the **existing exact-handle lookup** · the found-traveler card (photo avatar, handle, display name) appearing/disappearing with the 200ms layout value as lookup resolves.
- [ ] Found-card states: **Invite** accent pill → on send, a 150ms crossfade to the dead **"Invited"** ghost pill, and the row lands in the Invited section via M1 behind the sheet · already-invited opens ghosted · already-a-member renders "On this trip", nothing to act on.
- [ ] The **no-results pivot** (2b): "No one matches "@x"" + "They might not be on Largata yet.", the invite link promoted into the accent well ("Send them the invite link"); the plain link row hides in this state.
- [ ] The **share-link row** (default footer): fetches-or-mints the trip's link and hands the URL to the **platform share sheet**; sub "Anyone with the link can request to join"; sharing again reuses the same URL. Client analytics event on share.
- [ ] Inviting works **as a non-owner member** (the 01 policy, walked through this UI).
- [ ] **The editor header's "Invite Traveler" action is removed** and **the old invite screen and its route are deleted** — no navigation reference to either survives (grep the tree; the S4.13 dead-weight lesson).
- [ ] M4 timings on present/dismiss; M5 press; Reduce Motion honored.
- [ ] Jest: the sheet's state machine (query → found / pending / member / no-results) · the pivot's visibility rules.
