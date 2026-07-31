# 04 — Workspace screen restructure + invite screen (mobile)

**Status:** implemented — closed on the local rig at ticket 06

**What to build:** the trip screen becomes the mock's workspace (spec decisions 7–8): eyebrow (**PRIVATE WORKSPACE**, from the visibility field) · title · avatar stack tapping to the members screen · status chip (green "Active" from `WorkspaceState.ACTIVE`; the archived variant replaces today's badge; `COMPLETED` unrendered) + roster count · tabs **Itinerary / Chat (greyed + analytics) / Details** · Itinerary tab = day-summary cards ("Day 1: Arrival — 2 activities") → the day surface · bottom **Invite Travelers** CTA. The **Details tab** absorbs the trip fields + Edit (header lease), the quiet archive link, and leave/transfer; the **archive and ownership-offer banners stay above the tabs**. The CTA opens the invite screen: exact-handle search wired to ticket 02's lookup (found → display card → Invite → Pending chip), the **From Your Network** section as a worded empty-state placeholder (no sample rows; analytics on view/tap — spec decision 11), and the email path re-skinned.

**Blocked by:** 02 — the invite screen's handle lookup.

- [x] The workspace screen renders chip, count, tabs; an archived trip explains itself above the tabs for owner and member (spec AC 10)
- [x] The Chat tab greys with `comingSoon` + analytics and dead-clicks nowhere on web (spec AC 11)
- [x] Details tab carries fields + Edit, archive link, leave/transfer; nothing from today's screen is orphaned (spec decision 8's redistribution)
- [x] A full exact handle finds the traveler and invites them; the invitee's inbox shows it; a partial handle finds nothing; email invite still round-trips (spec AC 13 — client half)
- [x] The network section renders its empty state — words, never rows — with its analytics call site (spec decision 11)
- [x] Owner-only affordances (invite CTA per S1.2's owner-only issuance, archive link) render by role, from the roster the screen already fetches

## Comments
