# CM-3 — The trip grammar: `/v1/trips/**` for the whole workspace, and the client cut over

**Status:** ready-for-agent — drafted 2026-09-07 and grilled that day at TW-1's grilling (record `docs/plans/TW-1-trip-workspace-module/grilling.md`, round 1 Q1–Q4, Q7, Q13 and round 2 Q5, Q8, Q9); the breakdown of six tickets approved by the founder at `/to-tickets` (2026-09-07) with the two mechanics owed there confirmed; not started; **ships first in the content-remodel arc and waits on nothing** · **Epic:** none (the content-remodel arc, after CM-2) · **Depends on:** CM-1 (merged — the `/v1/trips` root, `DELETE /v1/trips/{id}`, the itinerary module's publish route), CM-2 (merged — the content readers already cut over) · **Branch:** `feature/CM-3-trip-grammar`.
**ADR:** **ADR-037** (minted with the arc's docs PR) — a trip is the trip itself; the workspace gets its own grammar on the same handlers; the old root sunsets with the old package at CM-5.
**Candidate-capability note:** none — every act that exists today exists afterward at a second address; no traveler act is added.
**Freshness note:** no surface changes lane. The workspace stays live over the `itinerary:{id}:{channel}` topics, whose grammar and `itineraryId` payloads do not move — the REST grammar changes, the transport grammar does not. The post-publish screen and the published page stay focus-fresh pull on the old projection until CM-5.

## Problem Statement

The trip is the one object with no address of its own. Postcards, diaries and publications answer at `/v1/postcards`, `/v1/diaries` and `/v1/publications`; the trip — the thing every workspace screen is about — answers at `/v1/itineraries`, a noun frozen before the vocabulary settled, and on 2026-08-30 a parallel grammar was declined as duplicate endpoints for a vocabulary benefit. The founder ruled the other way at TW-1's grilling, and gave the reason as the model rather than the wire: a trip is the trip itself; it is never transformed; its owner creates an itinerary based on it. Once that is the model, the workspace's address is the trip's, and the shipped app should say so.

## Solution

Give every workspace route a second address under `/v1/trips/**`, declared on the same controller as its `/v1/itineraries/**` original, so the two grammars are one Java method and cannot drift. Retire CM-1's dark ten-field read on `GET /v1/trips/{id}` for the full record the old detail answers. Point the client's five workspace repositories at the new root, rename the trip repository, move the client's publish onto the itinerary module's existing route, teach the client the trip's refusal code beside the old one, and migrate the end-to-end suites and the seed scripts so every walk drives the new grammar. Prove the bridge with a test that enumerates the handler mapping and names any old route without its twin, and a test that calls both grammars with one bearer and diffs the bodies byte for byte. No file moves: that is TW-1, two stories later.

## User Stories

1. As a traveler on the new app version, I want every workspace screen to talk to `/v1/trips/**`, so that the trip is addressed as what it is.
2. As a traveler on the shipped app, I want `/v1/itineraries/**` to answer exactly as before, so that a grammar change I cannot see costs me nothing.
3. As a trip owner publishing from the new app, I want the itinerary module's route to do the publishing, so that the act creates an itinerary rather than transforming my trip.
4. As a traveler editing a plan with a co-traveler, I want the editing-session and plan-saved frames to arrive as they do today, so that the live workspace is untouched by where the screens point.
5. As a traveler shown a missing-trip message, I want the same message whichever root the app used, so that the address never decides what I read.
6. As the next agent, I want a test that fails the moment an old-grammar route has no `/v1/trips` twin, or a twin served by a different method, so that the grammars cannot drift silently.
7. As the next agent, I want the new-grammar walks to be the same end-to-end files the old grammar had, so that migrating the suites is the proof rather than a second suite.
8. As the founder, I want the old root to stay served until the old package is decommissioned, so that the rollback path is the old address and not a revert.

## Implementation Decisions

**The rulings, from the grilling record.** A trip is the trip itself; an itinerary is created from it by publishing; forking an itinerary creates a trip. The whole workspace gets a `/v1/trips/**` grammar (round 1 Q1 of the planning pass, upheld at the grilling). Suffixes are verbatim (round 1 Q3). The old root sunsets when the old package is decommissioned at CM-5, not before (round 1 Q4). `GET /v1/trips/{id}` answers the old detail's full record (round 1 Q7). The end-to-end suites migrate (round 1 Q13). The trip has no publish act on the new grammar (round 2 Q5). The twin set is 47 of 60 (round 2 Q8). The refusal code stays `ITINERARY_NOT_FOUND` on both roots until CM-5 (round 2 Q9). The trip repository is renamed; hooks and keys are not (round 3 Q2).

**The twin is the same handler.** Each trip-owned controller declares both roots at class level — `{"/v1/itineraries/{itineraryId}/days", "/v1/trips/{itineraryId}/days"}` — and the modules that own trip-rooted routes add the second root to their existing mapping, one line each: `PollController`, `ChatController`, `TripJoinController`, `TripMembershipController`. The path variable's name is the same on both patterns. The old `ItineraryController`'s `publish`, `unpublish` and `audience` methods, `finish-planning`, and `fork` keep the old root only, so the class-level pair cannot apply to that controller whole: its twinned methods and its old-only methods are split across two classes in the same package, both in the old world, nothing moved. The 8 old diary-entry routes get no twin. **47 twins, 13 exclusions**, each exclusion named in the twin test with its reason.

**`GET /v1/trips/{id}` answers the full record.** CM-1's `TripResponse` (ten flat fields, `viewerRole` populated) retires with `TripController.read`; the unified detail handler answers `ItineraryResponse` — thirty fields including the plan tree, `viewerRole` null on the detail as it is today. `TripReadContractIT` is rewritten as the new-grammar contract test. `DELETE /v1/trips/{id}` stays alone in its controller under the new root only; a method-level mapping on the unified controller would mint `DELETE /v1/itineraries/{id}`, which S4.38 deliberately left unminted, and the twin test asserts that absence.

**Publish moves to the itinerary module's route in the client, and nowhere else.** The new client's `publishTrip` calls `POST /v1/trips/{id}/publish` — the route CM-1 built, which creates or refreshes the itinerary object and flips the trip's `published` flag as a bridge for the old readers — and answers the object, not the trip record; the mutation therefore invalidates the trip's cache entry instead of writing the response into it. `unpublishTrip` calls the itinerary module's `unpublish` and answers `204`. The old flag-only flip at `POST /v1/itineraries/{id}/publish` is untouched. The post-publish screen keeps reading `/v1/published-itineraries/{id}`, the old live projection, until CM-5 moves it onto the object.

**The refusal code.** A missing trip answers `ITINERARY_NOT_FOUND` on both roots, because one handler answers one code, and the client handles that code in four files. The client learns `TRIP_NOT_FOUND` beside it in the same four places now — one line each — so CM-5's flip costs nothing. The dark delete's `TRIP_NOT_FOUND` stays as it is.

**Client.** `src/repositories/itineraryRepository.ts` becomes `tripRepository.ts` with every function on `/v1/trips/…` except `fetchPublished`, which stays on the old projection's `/v1/published-itineraries/{id}`; `invitationRepository.ts` (9 trip-rooted functions), `joinRepository.ts` (4), `pollRepository.ts` (5) and `chatRepository.ts` (2) repoint; `diaryRepository.ts` is content and stays whole. `itineraryKeys` and the forty hook exports keep their names — the websocket handlers write into those keys, and a rename there is a second risk in the story that rewires the HTTP layer; it waits for CM-5's housekeeping. Two structural guards in `layering.test.ts`'s style: no repository names `/v1/itineraries` except the diary one and `fetchPublished`'s path, and every cache write in `src/query/tripEvents.ts` goes through an imported key factory. No screen changes.

**End-to-end suites and scripts migrate.** The 45 Playwright files that speak `/v1/itineraries` (around 415 occurrences), the seed helper's 12 calls, and the 7 scripts move to the new root. The backend integration tests are the old grammar's proof until CM-5 deletes it.

**The proof.** `TripGrammarTwinIT` reads `RequestMappingHandlerMapping.getHandlerMethods()`, collects every `(method, pattern)` under `/v1/itineraries`, asserts a `/v1/trips` twin with the same method and the same `HandlerMethod`, minus the named exclusions, and asserts no handler for `DELETE /v1/itineraries/{id}`; sabotage checks that the scan sees at least 55 old-root mappings and that every exclusion names a registered mapping. `TripGrammarEquivalenceIT` calls both roots with one bearer and diffs the bodies byte for byte for the reads, and modulo ids and timestamps for writes on two freshly seeded trips, including the masking cases. Both reuse the shared context signature: the suite already runs 26 signatures against a 100-connection ceiling.

**Docs.** `08-object-contracts.md`'s wire table and ADR-037 land with the arc's docs PR; this story's ticket updates the contract doc's per-route table for the twins and retires the `TripResponse` row.

**Events: none new.** The transport grammar does not move.

## Owner rulings owed at review

None beyond the grilling record. Two mechanics to confirm at `/to-tickets`: that the twin declarations sit on the old controllers in their current packages (nothing moves, TW-1 moves them with their prefixes), and that the end-to-end migration is one mechanical ticket rather than spread across the others.

## Testing Decisions

A good test here asserts **what a path answers and which handler served it** — never a module's internals. Five seams, four of which exist.

1. **The old-world integration tests, unedited** *(the proof that the old root is unchanged)* — every IT that speaks `/v1/itineraries` passes with no edits; `TripReadContractIT` is the one rewrite, and it is a rewrite of a dark contract.
2. **Two new integration tests on the shared context signature** — the twin test and the equivalence test above, each sabotage-checked once by hand and its failure line read: a root removed from `DayController`, a fake delete mapping under the old root, one response field flipped.
3. **Playwright, both lanes** *(prior art: every spec under `e2e/`)* — the migrated suites are the new grammar's proof; `npx playwright test --list` and the `Total:` line read before the run, because a suite that fails to load reports nothing.
4. **Jest for the two client guards** *(prior art: `layering.test.ts`)* — each with a "would fire" case; `npx jest` in full once before the push, because the structural guards read their subjects with `readFileSync` and are invisible to `--changedSince`.
5. **The websocket frame tests, unedited** — the transport did not move.

What no seam reaches and the gate closes by hand, on the LAN rung with `t1 = owner, t2 = member`: create, a day and an activity under the editing session, save, cover, invite by handle, accept, chat, a poll and a vote, a join link, archive and unarchive, publish and unpublish — with the backend log read for `/v1/trips` requests and for zero `/v1/itineraries` requests except the published-itineraries read and the old diary paths.

## Out of Scope

Moving any file (TW-1) · the content-module boundaries (CM-4) · the readers' move onto the itinerary object, the publication module's rename, the sunset of the old root and the decommissioning (CM-5) · a destruction screen (`DELETE /v1/trips/{id}` stays dark) · renaming client hooks, keys or any backend type · corrected suffixes (the four misnomers are on the vocabulary-housekeeping line) · the Home feed's diary card and the workspace day's "Post to diary".

## Further Notes

- **Measured before this was written:** 60 old-root mappings across 11 controllers in 5 packages; the client's wire surface is 6 repository files and 0 screens; the client handles `ITINERARY_NOT_FOUND` in 4 files and `TRIP_NOT_FOUND` in none; `ItineraryResponse` carries 30 fields with `viewerRole` null on the detail; CM-1's `TripResponse` is a strict subset by name.
- **Why the old controller splits in two.** A class-level root pair applies to every method in the class, and five of `ItineraryController`'s methods must stay old-only. Two classes in the old package is the smallest honest shape; TW-1 relocates both.
- **The one behaviour change a traveler could notice:** after publishing from the new app the workspace refetches rather than updating from the response body, because the itinerary module's route answers the object. It is a refetch of one record.

## Comments
