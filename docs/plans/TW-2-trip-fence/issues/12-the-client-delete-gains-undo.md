# 12: The client — Delete gains Undo, and archive stops being a thing a traveler sees

**What to build:** what the founder ruled at Q1: *"trip archive is not a feature… as for the archived trip buttons in the trip, we should completely remove that."* The client's archive feature leaves: the *Archived trips* link on Trips and the Archived Trips screen it opens; the archive banner on the trip and its Unarchive control; the archive/unarchive confirm wording; the archive-control helper and its plan-editability twin; the archived chip; the `'archived'` posture wherever a tab, section or piece of chat furniture computes one; the poll-message and edit-locked-message branches keyed on `TRIP_ARCHIVED`; the archived route's screen label. What remains is Delete → archive → **toast with Undo** → unarchive: `deleteTrip` becomes undoable through the removal flow's existing mechanism (the one Leave uses), Undo calling the unarchive mutation the banner used to own, server-truthful at once as S4.38 Q19 specified. A deep link into a deleted trip renders the existing not-found handling — after ticket 03 the server answers 404 to the owner too, so the banner would be unreachable anyway. The web Playwright spec is rewritten from the archive walk to the delete walk. Every change is JS-only and Metro-walkable; no native build is involved. Spec decisions 1, 2, 4; grilling Q2, Q9, Q11, Q12.

**Blocked by:** 03 (the server's answer to the owner changes there; the client follows it).

**Status:** ready-for-agent

- [ ] Trips shows no *Archived trips* link on any tab; the archived route and its screen are gone, and the feedback screen-label completeness test is amended with them
- [ ] The trip screen renders no archive banner and offers no Unarchive; the archive-control helper, both confirm wordings, the archived chip branch and every `'archived'` posture are gone; no client code names `TRIP_ARCHIVED`
- [ ] Delete shows *Trip deleted* with **Undo**; Undo calls unarchive and the trip returns to its tab with its lifecycle intact; once the toast expires the trip stays gone — covered by the removal-projection unit tests gaining the undoable case
- [ ] Opening a deleted trip by deep link renders the existing not-found handling, for the owner as for a member
- [ ] `archiveControls.test.ts` is deleted with its subject; `tripTabs.test.ts`'s *archived stays out of every tab* case stands (the list still excludes archived); `tabRouting.test.ts` is amended for the removed route
- [ ] The web-project `archive.spec.ts` becomes `delete.spec.ts`: Delete → toast with Undo → the trip back; Delete → gone, no *Archived trips* link, deep link → not-found; a member's plan write on a published trip still refused; `npx playwright test --list` reports the expected `Total`
- [ ] The full `npx jest` run once before pushing — files are added and deleted under `src/`, which is the guards' blind spot — plus `tsc --noEmit`; the edit grepped in the Metro bundle before any walk; CI green on push

## Comments

*None yet.*
