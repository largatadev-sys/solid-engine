# 05 — The audience ladder: archived is owner-only

**Status:** ready-for-agent

**What to build:** archive becomes the tuck-away it was ruled to be (S4.1 grilling — reversing S1.9's "archive evicts nobody" *sight* on the record; an authorized isolation-semantics change, ADR-008 waiver renewed). A member's trip list excludes archived trips entirely; their direct reads of an archived workspace mask to not-found (the S1.6 pattern); the owner keeps full sight, badge and all. Memberships and content survive untouched — unarchive restores every member's sight and, for a published trip, the public page (that half is enforced inside ticket 02's endpoint; this ticket is the member-sight narrowing). The archive and unarchive confirm copy states the audience consequence: archiving takes the trip away from members and takes a published page down; unarchiving brings both back. Self-leave stays permitted on the wire — the existing leave ITs must pass unmodified — while being unreachable from UI when the trip is hidden, accepted on the record.

**Blocked by:** 01 — the visibility fact and its two acts.

- [ ] Archived: the member's trip list excludes the trip; the owner's list keeps it with the archived badge (spec AC 9)
- [ ] A member's direct read of an archived workspace → not-found; the owner's → 200; unarchive restores the member's list row and reads (spec AC 9)
- [ ] Archive confirm copy states the member-sight and public-page consequences; unarchive confirm states the restore, published page included
- [ ] The shipped self-leave endpoint's ITs pass without modification — wire semantics untouched
- [ ] Walked with pool accounts on device and preview: t1 = owner archives, t2 = member loses sight and regains it at unarchive (state which tag played which role)
