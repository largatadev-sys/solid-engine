# 06 — Travelers and Details tabs

**What to build:** the two live non-Day-by-Day tabs, shared by viewer and editor (spec decisions 9–10).

**Blocked by:** 02 (the tab-row shell).

**Status:** needs-triage

- [ ] Travelers: the roster list (avatars through the authenticated media path — ticket 07's `MediaThumb`) — list only; a row tap opens the existing member-management flows (remove, leave, ownership offer) with their guards intact.
- [ ] Invite Traveler on the workspace header (both surfaces) → the existing invite flow; the Travelers tab itself carries no invite affordance (the mock's header owns it).
- [ ] Details: the plan fields (destinations, dates, description, standouts, best time, cover) read-only with the edit path to the existing edit screen; publish/preview/archive controls where state-appropriate; **no lifecycle field** — the viewer's badge + CTA rail own lifecycle.
- [ ] The old members route's inbound links re-point or keep resolving (deep links must not dead-end) — decided and recorded here.
- [ ] Member view: Details' owner-only controls hidden per existing authority.
