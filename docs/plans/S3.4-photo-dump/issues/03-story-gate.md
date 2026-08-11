# 03 — Story gate

**What to build:** The story's closing pass, the S4.18 shape: full verification on the rungs that matter, the record updated, nothing riding along. Run the backend IT suite (`mvn -o test-compile failsafe:integration-test` — read the `Tests run:` counts, never the exit code) and the mobile suite; walk the tab on the local full stack via the web driver and the emulator (two pool travelers, so both delete authorities are exercised — state which tag played which role); confirm the candidate-capability note and the glossary/backlog amendments landed with the specs. BUILD_STATUS's S3.4 row flips in the last commit on the feature branch, before the squash-merge proposal.

**Blocked by:** 01 — The pool on the wire · 02 — The tab goes live.

**Status:** done

- [x] Backend ITs and mobile tests green with counts read from the summaries; typecheck clean.
- [x] The two-traveler walk closes spec ACs 1–3 on web preview and emulator against the local stack, entered through the real tab, screenshots captured.
- [x] BUILD_STATUS row updated in the final branch commit; squash-merge to `dev` proposed, not executed (promotions are propose-first).

## Comments

**Rung results.** Backend **605 ITs**, 0 failures (`mvn -o test-compile failsafe:integration-test`, counts read from the summary). Mobile **68 suites / 2380 tests**, `tsc --noEmit` clean. API rung `smoke-photo-dump.js` **20/20**; web rung `drive-photo-dump.js` **19/19** against the preview container. Emulator: dev build, JS from Metro on 8082, real native picker → crop → upload, verified by the backend log line `Photo stored: … subject=ITINERARY_PHOTO_DUMP` and both `photo_dump_*` analytics events in logcat.

**Roles.** `t1` = owner · `t2` = member · `t3` = the stranger on no trip (API rung only). Both delete authorities were exercised *through the UI*, not only at the IT seam: the member deleted their own photo, and the owner deleted **the member's** photo — which is what makes it owner authority rather than uploader authority, and which rendered the owner-branch confirm wording ("As the trip owner you can remove any traveler's photo") for the first time.

**The two sabotages.** Before trusting the suite, the two load-bearing decisions were deliberately inverted and the tests confirmed to catch them: swapping `requireWritable` → `requireEditable` fails `aPublishedTripStillTakesPhotosBecauseTheFreezeIsThePlan`; pointing the audience at `admits` instead of `admitsToTheWorkspace` fails `publishingNeverOpensThePoolToTravellersOutsideTheTrip` with a stranger reading a dump photo 200. Both restored.

**Code review, two findings actioned.** (1) An IT was added asserting the trip's own activity photos and cover stay out of the pool — decision 1's negative was structural (the subject discriminator) but untested, and it is the one collision that matters since both are keyed to the same itinerary id. (2) `TripMediaAudience`'s two ladders shared a duplicated archived-owner predicate; extracted, so `admits` is now visibly `admitsToTheWorkspace` plus the published-and-public tail and archive dominance cannot drift between them. The analytics event names moved out of the copy module into `photoDumpEvents.ts`. One flagged smell was declined: the `(myId, isOwner, archived)` trio stays positional — the pure module's tests pin every combination, and a wrapper type for one call site is speculative generality.

**One behaviour change beyond the ticket, recorded rather than reverted.** Tab selection moved from `tab === 'details' ? 'details' : 'day-by-day'` to `workspaceTabFrom`, which resolves `?tab=` against the live tab list. That is what makes `photo-dump` deep-linkable, but it also makes `travelers` reachable by URL where it previously was not, and every future live tab automatically. It refuses greyed tabs structurally, which the old ternary never had to. Judged an improvement on the ticket's "changes only this tab" line, not a violation of it.
