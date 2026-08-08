# 02 — The Trip Workspace (viewer): every own trip's home, read-only, the ladder wired

**What to build:** the mock's `Finalized workspace` layout as the home surface for every own unpublished trip in every lifecycle state (spec decisions 1–3) — badge + ladder CTA + Step back, the shared tab row, read-only expandable day stubs, Edit Itinerary with its session-aware disabled state.

**Blocked by:** 01 (the "being edited by" advisory + disabled Edit Itinerary).

**Status:** needs-triage

- [ ] Routing: draft/upcoming/ongoing/completed own trips open here from the trips list; archived opens here with the existing unarchive banner; published keeps the published view. S4.15's "Open Trip Workspace" goes live → here.
- [ ] Header per mock: back · state badge (Draft amber `#FEF3C7`/`#D97706` · Ready green `#DCFCE7`/`#15803D` · Ongoing blue `#E0F2FE`/`#0369A1` · Completed grey `#F3F4F6`/`#6B7280`) · Edit Itinerary text-button (pencil-square) · title + reserved provenance subtitle (renders only when forked — nothing today).
- [ ] Ladder CTAs per state: Ready → Start Trip · Ongoing → Complete Trip · Completed → Publish Itinerary (routes into the existing preview/publish flow); draft shows no ladder CTA. "Step back" quiet link on ongoing/completed, one `reopen` rung per tap.
- [ ] Edit Itinerary: on draft → editor; on Ready → `reopen` + editor in one tap; disabled with "being edited by X" while another traveler holds the session; hidden on archived/published.
- [ ] Tab row (both-surface component): Day-by-Day · Polls (greyed) · Travelers · Photo Dump (greyed) · Chat (greyed) · Details — coming-soon registry pattern, horizontal scroll.
- [ ] Day-by-Day: collapsed stubs (Outfit 700 16, chevron), expanding inline to a read-only activity peek; no edit affordances anywhere on the viewer.
- [ ] Member view: Start/Complete/Publish/Step back hidden for non-owners; Edit Itinerary follows plan-edit authority.
- [ ] Ownership/archive banners carry over above the tab row.
