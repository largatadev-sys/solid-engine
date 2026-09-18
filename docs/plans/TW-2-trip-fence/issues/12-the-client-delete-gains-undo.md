# 12: The client — Delete gains Undo, and archive stops being a thing a traveler sees

**What to build:** what the founder ruled at Q1: *"trip archive is not a feature… as for the archived trip buttons in the trip, we should completely remove that."* The client's archive feature leaves: the *Archived trips* link on Trips and the Archived Trips screen it opens; the archive banner on the trip and its Unarchive control; the archive/unarchive confirm wording; the archive-control helper and its plan-editability twin; the archived chip; the `'archived'` posture wherever a tab, section or piece of chat furniture computes one; the poll-message and edit-locked-message branches keyed on `TRIP_ARCHIVED`; the archived route's screen label. What remains is Delete → archive → **toast with Undo** → unarchive: `deleteTrip` becomes undoable through the removal flow's existing mechanism (the one Leave uses), Undo calling the unarchive mutation the banner used to own, server-truthful at once as S4.38 Q19 specified. A deep link into a deleted trip renders the existing not-found handling — after ticket 03 the server answers 404 to the owner too, so the banner would be unreachable anyway. The web Playwright spec is rewritten from the archive walk to the delete walk. Every change is JS-only and Metro-walkable; no native build is involved. Spec decisions 1, 2, 4; grilling Q2, Q9, Q11, Q12.

**Blocked by:** 03 (the server's answer to the owner changes there; the client follows it).

**Status:** done

- [x] Trips shows no *Archived trips* link on any tab; the archived route and its screen are gone, and the feedback screen-label completeness test is amended with them
- [x] The trip screen renders no archive banner and offers no Unarchive; the archive-control helper, both confirm wordings, the archived chip branch and every `'archived'` posture are gone; no client code names `TRIP_ARCHIVED`
- [x] Delete shows *Trip deleted* with **Undo**; Undo calls unarchive and the trip returns to its tab with its lifecycle intact; once the toast expires the trip stays gone — covered by the removal-projection unit tests gaining the undoable case
- [x] Opening a deleted trip by deep link renders the existing not-found handling, for the owner as for a member
- [x] `archiveControls.test.ts` is deleted with its subject; `tripTabs.test.ts`'s *archived stays out of every tab* case stands (the list still excludes archived); `tabRouting.test.ts` is amended for the removed route
- [x] The web-project `archive.spec.ts` becomes `delete.spec.ts`: Delete → toast with Undo → the trip back; Delete → gone, no *Archived trips* link, deep link → not-found; a member's plan write on a published trip still refused; `npx playwright test --list` reports the expected `Total`
- [x] The full `npx jest` run once before pushing — files are added and deleted under `src/`, which is the guards' blind spot — plus `tsc --noEmit`; the edit grepped in the Metro bundle before any walk; CI green on push

## Comments

**Closed 2026-09-18.** Archive is gone from the client as a thing a traveler can see, and Delete gained Undo.

**Delete → archive → toast with Undo → unarchive.** `deleteTrip` already called `POST /archive` immediately (S4.38 Q19's "call the server immediately"), so the change was small and exactly where the ticket said: drop `undoable: false`, add an `onRevert` to the removal queue calling a new `commands.unarchiveTrip`, and give `RESTORED_MESSAGE` a `Trip restored` for `deleteTrip` where it held `null`. The `onRevert` hook already existed — `useProfileRemoval` uses it for republish — so Delete now follows the same eager-plus-revert shape rather than inventing one.

**What left the client:** the *Archived trips* link and its route and screen; the archive banner and its Unarchive control; `archiveControls.ts` whole; the archive/unarchive confirm wordings and `audienceLadderCopy.test.ts`, which was entirely about them; `WorkspaceChip` and its test (**it was never rendered anywhere** — the only import was its own test); the `'archived'` posture on the travelers tab; the chat, poll and photo-dump read-only notices; both `TRIP_ARCHIVED` branches; the archived query options, hook and cache-key flag; the `archived` parameter on `fetchMine`; and two dead theme tokens.

**The ripple was wider than "remove a link", and the reason is worth recording.** Once the server answers 404 for a deleted trip *to everyone*, `data.archived` is always `false` on anything a client can reach — so every `archived` branch in the app is dead code. Four tab components took an `archived` prop that could only ever be `false`; `photoDumpTiles`, `footerActionsFor` and `boardIsWritable` took an argument that could only be `false`; `editItineraryAction` and `ladderCta` each checked it twice. Removing the surfaces without removing those would have left the app carrying a flag it could no longer receive.

**Two simplifications fell out of that, and both are improvements rather than side effects:**

- **`editItineraryAction` lost its `canEditPlan` parameter entirely.** It already checked `archived` and `published` itself, so the parameter was a second copy of a rule it owned — and the only thing that computed it was `canEditPlan`, which only checked `archived`. With archive gone the parameter said nothing; the function now reads `if (itinerary.published) return hidden`, which is the whole rule.
- **`TripPosture` is `'open' | 'published'`.** `archived` and `published` were treated identically everywhere the posture was consulted (`posture !== 'open'`), so dropping the arm changed no behaviour and one fewer value has to be reasoned about.

**Tests: 6845 pass, 203 suites, `tsc` clean, `playwright --list` reports 858 in 56 files.** Nineteen test cases changed or went. The pattern throughout: a test asserting *the archive feature exists* was either deleted with its subject or **inverted** to assert its absence, which is the more useful of the two — `tabRouting`'s archived-door test now asserts there is no door and no `archived.tsx` on disk, and the chat and polls tab tests assert their mounts hand over no `archived` flag.

**Two tests gained rather than lost:** `undoQueue.test.ts` now pins that a `deleteTrip` request is undoable, holds pending, and answers *Trip restored* on Undo with exactly one revert — the property the whole ticket turns on, tested at the pure seam rather than only through a browser.

**`mobile/e2e/web/archive.spec.ts` became `delete.spec.ts`**, as the ticket required: a deleted trip is not found for owner and member alike at read, at write and by deep link; Trips offers no archived list; Undo restores it for the **whole roster**, not just the owner; a published-then-deleted trip's page goes down and comes back with Undo; and the negative control — a member's plan write on a published trip still answers `ITINERARY_PUBLISHED`, not the mask. Three other web specs lost their archived walks: `chat.spec.ts` (the notice bar), `polls.spec.ts` and `photo-dump.spec.ts` (both rewritten as "a deleted trip is not found for its owner too"), and `trips-swipe.spec.ts`'s two archive assertions became *the toast OFFERS Undo* and *the deleted trip is gone from the owner app entirely*.

**One deletion needed care:** `screenLabels.ts`'s archived-route entry had to go **with** the route file, because `reportScreen.test.ts` checks the registry bidirectionally — a label for a route that no longer exists fails just as loudly as a route with no label.

**JS-only and Metro-walkable throughout; no native build involved.** The LAN phone walk belongs to ticket 13.
