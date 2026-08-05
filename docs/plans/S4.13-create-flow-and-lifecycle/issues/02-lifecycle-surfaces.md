# 02 — Lifecycle surfaces: Trips sections, workspace controls, tab bar

**What to build:** the traveler sees every trip in one of four lifecycle sections on the Trips screen, moves a trip through its life from the workspace with taps, and navigates a four-tab bar. The mock's Trips landing, with the model's forced fourth section.

**Blocked by:** 01 — the four-state lifecycle on the API.

**Status:** done

- [x] The Trips screen renders stacked sections — **Ongoing · Upcoming · Draft · Completed**, in that order — replacing the S4.11 chips; membership derives from `state` alone; empty sections are hidden.
- [x] Cards match the mock's anatomy (image slot, date, title, status row); the status slot carries **only** the amber "Currently being edited" lease advisory, on any card whose trip has a live lease; Draft cards carry the "Continue editing your Trip Workspace" subtitle; no publication or visibility badge renders anywhere on this screen.
- [x] Drafts and Upcoming/Ongoing trips route to the workspace; Completed published trips route per the S4.11 routing rule (unchanged).
- [x] The workspace's lifecycle controls re-anchor to the ladder: Start trip (`upcoming → ongoing`), Mark completed (`ongoing → completed`), the one-step undo, with the workspace eyebrow labels following the four states.
- [x] A publish attempt on a non-completed trip explains the precondition in the dialog, naming the actual state (the S4.13 wording over four states).
- [x] The tab bar is **Home · Discover · Trips · Profile** — the FAB and its route are gone; creation's only door is the Trips screen's orange **Create Itinerary** CTA; Home and Discover stay greyed with analytics taps (the S4.9 rule; Discover renames Search, same icon family as the mock).
- [x] "Add a Past Trip" renders below Create Itinerary in the grey-out shell pattern — visible, dead, honest.
- [x] Section mapping and any new label logic live in pure helper modules under unit test; screens consume tokens only; mobile suite + `tsc` green.
