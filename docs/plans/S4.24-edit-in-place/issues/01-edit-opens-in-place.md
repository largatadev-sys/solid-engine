# 01 — Edit Itinerary opens in place

**What to build:** The reversal, whole. A member of any unpublished, unarchived trip — Draft, Ready, Active, or unpublished Completed — taps Edit Itinerary and lands in the Itinerary Workspace with the trip's state untouched: no reopen, no re-climb afterwards, no diary blackout mid-trip. Step back appears on Ready so a mis-tapped Finalize keeps its undo now that Edit no longer reopens. The editor header chip reads "Trip Workspace" in every state, and Save Changes is the only act the editor offers a non-draft trip (Finalize stays where it is, draft-only). Everything that guarded editing before still guards it: the exclusive Editing Session, the staged buffer, the version-checked save, the published/archived refusals.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Edit Itinerary shows and opens the editor directly — no reopen call, no state change — on Draft, Ready, Active and unpublished Completed trips, for owner and members alike
- [ ] The hidden/blocked cases are unchanged: published, archived, no edit permission, session held by another (which still reads "being edited by …")
- [ ] The `reopen-then-edit` action kind is gone from the control model; the viewer's edit handler never calls reopen
- [ ] Step back appears on Ready — owner-only, quiet, reopen-planning confirm wording — and still on Active/Completed
- [ ] The editor chip reads "Trip Workspace" in every state; the editor offers only Save Changes for non-draft trips
- [ ] Backend IT pins the domain rule: Editing Session acquire + bulk plan save succeed at `upcoming`, `ongoing` and unpublished `completed`; refused when published or archived
- [ ] The buffered-plan walk enters the editor from a *Ready* trip through the real Edit Itinerary affordance, saves, and asserts the state never moved
- [ ] The `workspaceControls` test file covers the new decision table (states × owner/member × session held/free)
