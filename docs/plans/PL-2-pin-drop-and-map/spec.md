# PL-2 · Pin-drop capture and the in-app map

*Grilled 2026-09-02 (grill-with-docs, six rounds, 33 questions, founder-ruled throughout). No design canvas — this story was grilled from a running product rather than a mock, and the picker/viewer chrome follows the shipped token sets and the modal precedents already in the tree. Successor to PL-1, which shipped the reading half; this is the capture half the founder asked for first. Pulled after the billing deferral was re-examined and found to gate **only** vendor establishment search — not maps, not pins.*

## Problem Statement

A traveler cannot attach a real location to anything. Every place in Largata is a string typed freehand, and PL-1 made those strings tappable by handing them to Google Maps as a search — which computes a pin at tap time from text alone, and lands on the wrong lagoon whenever the text is ambiguous. The founder's original ask, made before any of this was built, was to *pick* a place: tap a field, find the real spot, and have the app remember where it is. What shipped instead was a link, because a scope collapse at PL-1's grilling folded three separate capabilities — searching establishments by name, pointing at a location, and showing a location — into one "needs Google billing" and deferred them together. Only the first of the three is actually billing-gated.

## Solution

An activity's location becomes a **Pin**: a point on a map the traveler chose, stored as coordinates beside the free text that names it. Dropping one is a map screen with a search box — type "Big Lagoon", tap the result, nudge the pin if the geocoder was 200m off, confirm. Reading one is the same map screen without the crosshair: tap a pinned location anywhere in the app and it opens in-app, showing where it actually is, with a one-tap escape to Google Maps for directions we will never provide. Both surfaces are drawn by one hand-rolled tile viewer over free OpenStreetMap tiles — no map SDK, no key, no billing, and no native module, so the whole story is walkable on the web preview while the device rung stays blocked. Places that were only ever typed keep PL-1's behaviour permanently; text-only is a first-class state, not a migration backlog.

## User Stories

1. As a trip planner, I want to drop a pin on a map for an activity, so that the app knows where the place actually is rather than guessing from its name.
2. As a trip planner, I want to search for a place by name inside the picker, so that I do not have to pan the world to find El Nido.
3. As a trip planner, I want a search result to centre the map under the pin, so that I can correct a geocoder that landed near but not on the spot by moving the map. *(Originally "a pin I can then drag". The founder ruled the Uber/Grab pan-under-a-fixed-pin on the walk, 2026-09-01, after both tap-to-drop and drag-the-pin were built and each failed on a real finger: a pin the finger never has to hit is the one gesture a phone makes easy.)*
4. As a trip planner, I want the search result's name offered rather than forced into my label, so that "Big Lagoon Kayaking" is not silently renamed to "Big Lagoon".
5. As a trip planner, I want the picker to open near my trip's destination, so that the map starts where my trip is instead of at a world view.
6. As a trip planner adding a second activity, I want the picker to open near the last pin I dropped, so that a day's stops are a nudge apart rather than a fresh search each time.
7. As a trip owner, I want to pin my trip's destination itself, so that every activity picker in that trip opens in the right region with no lookup.
8. As a trip planner, I want to remove a pin I no longer want, so that a wrong location is not permanent.
9. As a trip planner who renames a place, I want its pin cleared, so that the label and the pin can never quietly disagree.
10. As a trip member, I want to tap a pinned place and see it on a map inside the app, so that I can orient the plan without leaving.
11. As a trip member, I want to pan and zoom that map, so that I can see what is around the pin.
12. As a trip member, I want an "Open in Google Maps" action inside the viewer, so that I can get directions, which the in-app map does not offer.
13. As a trip member looking at a place that was only typed, I want the tap to open Google Maps as it does today, so that nothing that worked before stops working.
14. As a stranger reading a published itinerary, I want to tap an activity's place and see it on a map, so that I can judge where a plan actually goes before forking it.
15. As a stranger reading a published itinerary, I want the header destination to open on a map too, so that the whole trip orients at a glance.
16. As a traveler forking a published plan, I want its pins to come with it, so that the copy is as usable as the original.
17. As a screen-reader user, I want to find and choose a place from a search result list, so that I can set a location without ever manipulating a map.
18. As a screen-reader user, I want a location announced by its name rather than its coordinates, so that what I hear is what a sighted traveler reads.
19. As a traveler on a slow or broken connection, I want the picker to keep working when search is unavailable, so that I can still pan and drop a pin by hand.
20. As a traveler, I want a pin to require a label, so that a day card never shows a location I cannot read.
21. As a traveler who cancels the activity form, I want any pin I dropped to be discarded with it, so that the pin behaves like every other field on that screen.
22. As a traveler with months of existing typed places, I want them to keep working untouched, so that nothing I already wrote needs revisiting.
23. As the OpenStreetMap project, I want visible attribution on every map surface, so that the licence under which the tiles and search results are given is honoured.
24. As the founder, I want the tile and geocoder endpoints to be configuration rather than constants, so that a provider withdrawing access is a config change and not an app release.
25. As the founder, I want the new module's boundaries enforced by a test from the day it is born, so that it does not become a second unreadable `itinerary`.

## Implementation Decisions

**The renderer, and why it is not a map library.**
- A **hand-rolled raster tile viewer**: a pannable grid of OpenStreetMap tile images zoomed by pinch, wheel, double-tap and +/− controls, written once in JS and rendered identically on native and web. No map SDK. **Zoom is continuous and anchored** — the view carries a fractional zoom and holds the point under the fingers still, and only a saved pin rounds to the whole number the `SMALLINT` column takes. *(Pinch was removed at the founder's ruling on 2026-09-01 and restored on 2026-09-03 once the cause was found: the zoom was being rounded, so the gesture could only jump between whole levels.)*
- **`react-native-maps` was tested and rejected on evidence**, not preference: its web fork is a single line — `export {default} from 'react-native-web/dist/modules/UnimplementedView'` — which renders an empty `View`, red-bordered in development and **entirely invisible in production**. Verified in both 1.29.0 and 1.27.2, the version Expo SDK 57 pins. It would have shipped a blank rectangle on the only rung currently available, with no error. On Android it additionally renders through Google's SDK and wants a billed key.
- **MapLibre was considered and deferred**: genuinely keyless and OSM-native, but a native module needing a new config plugin and a working Gradle build — the fault that has blocked the device rung across four stories. Swapping it in behind the same component later is a contained change, to be made with a working feature in hand rather than on a guess.

**Pin and Place — two facts, not two spellings of one.**
- **Place** stays the free-text label: what a human calls the location, rendered on every surface, unchanged in meaning from ADR-013's described-landmark shape. **Pin** is the new domain noun: where it is. An Activity may carry a Pin; so may an Itinerary's destination.
- A Pin is `{ lat, lng, zoom }` — the zoom the traveler dropped it at, because a pin on a beach and a pin on a doorway carry different intent and the viewer should reopen as framed.
- **A Pin requires a Place.** Confirm is refused without a label, and the search result offers its name to fill one. Every read surface in this app is text-first; a location a traveler cannot read on a day card is worse than no location.
- **The stale-ref rule (founder ruling):** editing a Place's text **clears its Pin**. It fires on **save**, compared against the text the pin was dropped with — never on keystroke, or fixing a typo would destroy the pin. Accepting a search result sets text and pin **atomically**, so the acceptance cannot trigger the clear it just caused. Going from empty to filled never clears.

**Search, and where it runs.**

- **Panning reverse-geocodes what is under the pin**, after a settle rather than per frame, and **offers** the name it finds — filling the field only while the traveler has not typed over it. This is the other half of pan-under-the-pin: without it the traveler names every spot by hand. It rides the same proxy, the same cache and the same limiter as forward search, and Photon serves it on a second path (`photon-reverse-url`), derived beside the forward one so a self-hosted geocoder cannot leave reverse lookups pointing at somebody else's public service.
- **Rate limits are per traveler AND global.** Per-traveler alone lets a handful of travelers spend a courtesy service's goodwill between them, which is the same shape as the report limiter's daily cap.
- **A missing geocoder is fatal at startup, never a silent downgrade.** The fixture suggester is for tests and local runs; accepting it is an explicit opt-in, so a deployed rung that forgot its configuration refuses to boot instead of quietly serving eight hardcoded places.
- **Photon** (`photon.komoot.io`), keyless, is the geocoder. **Nominatim is excluded by its own policy**, which states plainly that auto-complete *"is not yet supported by Nominatim and you must not implement such a service on the client side"*, and that applications whose primary function is geocoding must self-host.
- Search runs **through a new backend `place` module**, never client-direct: the mobile layering guard forbids raw `fetch` outside two allowlisted files, the free services identify and rate-limit by caller, and a proxy is the only place a cache and a provider swap can live. This is the module whose structure prompted the original "how do we not build another `itinerary`" question, and it is born with the **ArchUnit boundary pilot** — referenced by ID and service interface only (ADR-002), internals reachable from nowhere else.
- The module selects its suggester by configuration in the `InvitationMailConfig` shape: the Photon-backed one in a running stack, a **fixture suggester** in tests, so no integration test ever calls Komoot.
- **Search is an accelerator, never a dependency.** Photon guarantees no availability; when it fails the search box says so and the map and the pan-to-place both keep working. The same holds for the reverse lookup below: an unreachable geocoder says so on the context line rather than reading as "nothing is named here", because those two are not the same answer.
- **Cache results, and rate-limit per traveler.** A typeahead box is the easiest way to accidentally hammer a free service; the cache is what keeps us inside *"please be fair"*, the limit is what stops one client bug from costing everyone the provider.
- Coverage was **measured, not assumed**: every El Nido fixture resolved — Big Lagoon, Shimizu Island, Las Cabañas, Nacpan, and a named sari-sari store — with correct OSM tags and sensible typeahead ranking under a lat/lng bias.

**Tiles and the licence.**
- **OpenStreetMap standard raster tiles.** The genuinely keyless raster field is short (OSM, OpenTopoMap, CyclOSM); OpenFreeMap is keyless but vector-only, CARTO now requires a key, Stadia forbids commercial use.
- **The tile URL is server-supplied configuration, not a constant.** OSM's policy is explicit that access is best-effort and *"may be withdrawn at any point"*, and its own advice is to keep the source switchable. Esri is the recorded fallback: keyed, but commercial use permitted.
- Tiles are fetched **direct from the app in v1**. A backend tile proxy would let us set the identifying User-Agent that a browser will not permit, and hold one policy-compliant cache — it is **parked** against observed throttling or growth, not built for a handful of testers.
- **Attribution is a licence obligation and is treated as one**: `© OpenStreetMap contributors`, linking to the copyright page, persistent in the bottom-right of **both** map surfaces. It covers the geocoding results as well as the tiles. A splash-screen credit is permitted by OSMF and deliberately not used — it is the kind of thing a later redesign deletes.

**Surfaces and shapes.**
- **The picker is a modal overlay**, not a pushed route. expo-router unmounts the screen beneath a pushed route on web (the S4.18 finding) and the activity form holds its typed place in local state, so a full-screen picker would eat it on the founder's own verification rung. The `DumpPickerModal` shape is the precedent.
- **The viewer is a pushed route** — nothing beneath it to lose, and it earns a URL.
- **The viewer is interactive**: pans and zooms, opening at the pin's stored zoom. Its **Open in Google Maps** asks for the named place anchored at our point, falling back to bare coordinates and then to PL-1's text query — so the escape opens the place, not a dot.
- **Confirming without moving the map saves TEXT ONLY.** A traveler who names a spot but never touches the map has expressed no point, and inventing one from wherever the picker happened to open would plant a confidently wrong pin — the failure the no-backfill ruling exists to avoid. A map that cannot move reads as broken to anyone who has used a map.
- Confirming a pin **stages into the draft store** with every other field of the activity form and persists on Save Plan. Writing immediately would make it the only field on that screen that survives a cancel.
- Capture lands on **Activity** and on the **Itinerary's destination** — the destination pin is not a nicety, it is what lets every activity picker open in the right region with no geocoding call at all.

**What reaches strangers — a deliberate amendment to canon.**
- **Pins are published** (founder ruling): activity pins and the destination pin both reach `PublishedItineraryResponse`, and the in-app viewer works for strangers reading a published plan.
- This **amends INV-11 and INV-2 on the record**, and the story carries that amendment rather than making the change silently. INV-11 strips EXIF GPS from every uploaded photo on the stated grounds that *"a photo's GPS tag broadcasts a traveler's location more precisely than dates ever did, and location context belongs to the plan's own free-text fields"* — a rationale that plainly reaches coordinates on an activity. The amendment's argument: **publication requires `completed`**, so a published pin records where a traveler *was*, on a trip they chose to publish, not where they are or will be. INV-2's rule governs current and future absence and is untouched by a past trip's map. INV-11's *mechanism* — involuntary metadata riding along inside a photo — is also untouched: a Pin is a deliberate act with its own affordance, which is the distinction ADR-025 already drew for postcards.
- **Postcards and diary entries carry no Pin.** `DiaryEntry.place` is a snapshot frozen at post time (INV-5); showing a live pin beside frozen text would let the two drift into a lie no test catches. They keep PL-1's text tag and Google Maps handoff, `FeedPostcardResponse` is untouched by this story, and coordinates therefore never reach the feed — which is the surface that posts from **ongoing** trips and the one place the privacy objection had real force.

**Data.**
- Nullable `latitude`, `longitude`, `zoom` columns on the activity and itinerary tables — **plain numerics, no PostGIS**: we store points and never query spatially, so the extension would be an ops burden bought for nothing. Revisit only if proximity search ever becomes real.
- On the wire the Pin is **nested and nullable** — `pin: { lat, lng, zoom } | null` — so half a pin is not expressible. Additive under ADR-008 throughout; nothing is renamed, retyped or removed.
- **No backfill.** Geocoding hundreds of existing strings to guess coordinates nobody verified is how confidently-wrong pins reach real trips, and a data migration is invisible to every local rung this repo owns. Text-only stays permanent, not transitional.
- **Forks carry pins.** A Pin is plan data in exactly the way place text and cost are.
- **Candidate-capability note:** place **search** — it consumes a shared external quota and is footprint-growing. Pin-drop itself is ordinary data entry on one's own trip and is not a candidate. The obvious guess is the wrong one, which is why it is recorded.
- **Freshness note:** **deliberately static** — no surface changes lane. Pins ride the itinerary query the screen already runs; tiles and search are external calls made at interaction time.

## Testing Decisions

- Good tests here assert **external behaviour**: the coordinates a confirm produces, the URL a tap hands the opener, the field on the wire, the rendered label and role — never component internals or tile bookkeeping.
- **The tile mathematics is the story's principal pure seam** and must be extracted rather than tested through a rendered map: Web Mercator lat/lng ↔ tile x/y/z, the pixel offset of a coordinate within its tile, and which tiles cover a viewport at a given zoom. Jest tables in the `landingSlot.ts` precedent — S4.17's drag maths, extracted for exactly this reason, whose first run caught a real rounding asymmetry.
- **The stale-ref rule is the second pure seam**, and the one most likely to be got wrong: a table over (text at drop, text at save, pin) covering the typo case, the atomic search-acceptance case, and empty-to-filled.
- **Pin validity is the third**: coordinate ranges, zoom bounds, and the label requirement.
- **Backend**: the `place` module's suggester contract tested against the fixture implementation, the cache and the per-traveler limit tested at the service, and the **ArchUnit boundary test** asserting nothing outside `place` reaches its internals. Migration coverage follows the `WorkspaceBackfillIT` pattern — its own container, stepped to the prior version, legacy rows planted in raw SQL — and must be **sabotage-checked**, with the sabotage proven to have landed before the run is believed.
- **Playwright** extends the existing suite: a picker walk (open, search, tap a result, confirm) asserting the coordinates that reach the request, and a viewer walk asserting a pinned place opens the in-app route while a text-only place still hands off to Google Maps via PL-1's captured `window.open`. Specs import strings from `.ts` modules only. Search is served by the fixture suggester, so no walk depends on Komoot being up.
- **The rung no suite reaches:** real-finger pan and zoom. The LAN rung closes every functional AC — search, pan-to-place, confirm, view — on a real phone with a real finger. **Native gesture parity is an explicit open AC**, as it was at PL-1: the recorded Gradle fault is budgeted per the gotcha, one diagnostic pass and not a session.

## Out of Scope

- **Place pages** — tapping a location to see other travelers' posts from the same place. Named here so its absence is a decision: our pins are loose coordinates with no shared identity, so two travelers pinning the same lagoon produce two unrelated points. Grouping them needs canonical place records, which is PL-3's territory and a new public social surface with its own privacy questions.
- **PL-3**: Google Places establishment suggestions, stored `place_id`s, exact pins via `query_place_id`. Still parked behind the billing trigger, now holding only what billing actually gates.
- Pins on postcards and diary entries, in any form.
- Offline tiles and tile pre-fetching — prohibited by OSM's policy, which forbids *"any pre-emptive fetching of tiles other than those a user is actively viewing"*.
- PostGIS, proximity search, routing, directions, and turn-by-turn — the Google Maps handoff exists precisely because we will not build these.
- A backend tile proxy and self-hosted Photon or Protomaps tiles: both parked with triggers, not built.
- Device-location centring. It is silently unavailable on the LAN rung, where a bare-IP origin is not a secure context — the recorded FB-3 trap — so it cannot be verified where this story is verified.

## Further Notes

- **Decision provenance:** all rulings founder-made at the 2026-09-02 grilling — pins public rather than workspace-only (taken with the INV-11 conflict stated in front of him), the strict stale-ref rule over independent fields, one story rather than two, and the scope boundary at place pages. The agent's recommendations were followed on the renderer, the geocoder, the module placement and the surfaces.
- **Three capabilities were conflated at PL-1's grilling and are separated here**, because the conflation cost a feature: *searching establishments by name* is billing-gated only if the vendor is Google; *pointing at a location* needs tiles alone; *showing a location* needs tiles plus coordinates. PL-1's spec recorded the first as gating all three. It did not.
- **Two citation corrections to PL-1's spec**, found while establishing canon: the "described-landmark shape" it attributes to **ADR-013** is not in ADR-013, which says nothing about place or geo — the wording is a founder call recorded in V7's migration comment. And "register #9" is vendor API integrations, not Place Search.
- Provider policy shifted underneath the earlier assessment and was re-read rather than remembered: OSM's tile policy **no longer forbids** distributing an app that uses its tiles, the line having been rewritten to *"we welcome creative uses"* with revocability as the stated condition.
- The activity form's placeholder — *"Search for a place..."*, unfulfilled since S4.17 and flagged at PL-1 — is finally honest when this ships.
