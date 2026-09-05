# PL-1 · Tap-to-map location links

*Grilled 2026-09-02 (grill-with-docs, three rounds, founder-ruled throughout). Design baseline: the founder's Claude Design canvas, archived in [`design/`](design/) beside this spec — high-fidelity, every value traceable to shipped token files. No epic — the WS-1/H1 shape. The scope collapsed deliberately mid-grilling: deferring Google billing deferred autocomplete, place IDs, and the whole `place` backend module to **PL-2** (parked on the epic map's geotag line, with trigger); what remains is the founder's original ask, whole.*

## Problem Statement

Every location in Largata is a free-text string that names a place and goes nowhere. A traveler reading "Big Lagoon Kayaking" on a day card, a stranger reading "Shimizu Island" on a published plan, a feed reader seeing the "Big Lagoon, El Nido" tag on a postcard — all of them do the same thing today: copy the text, switch to Google Maps, paste, search. The app knows the place and makes the traveler do the lookup. Meanwhile the activity form's placeholder has promised "Search for a place..." since S4.17 without any search behind it — this story pays the reading half of that debt.

## Solution

Every rendered location becomes a tappable link that opens Google Maps searching for that text — Maps computes the pin at tap time. Searches are destination-hinted where the trip's destination is known ("Big Lagoon Kayaking, El Nido, Palawan"), which turns an ambiguous string into a nearly-always-right pin. One affordance vocabulary everywhere: tinted, pressable, single-line. The feed card re-chromes (the grilling's variant C): the trip-title line becomes the door to the published trip, and the location tag always opens Maps — even on unpublished trips, where it previously went nowhere at all. Capture does not change: no picker, no new fields on any form, and every location already in the database lights up on day one with no migration.

## User Stories

1. As a trip member, I want to tap an activity's place on the workspace day card, so that Google Maps opens on that place without me retyping it.
2. As a trip member looking at an activity with no place, I want the meta line to stay plain muted text, so that nothing invites a tap that has nowhere to go.
3. As a stranger reading a published itinerary, I want to tap an activity's place in the Day-by-Day tab, so that I can see where the plan actually goes.
4. As a stranger reading a published itinerary, I want to tap the destination pill in the header, so that I can orient the whole trip on a map.
5. As a feed reader, I want to tap a postcard's location tag and land in Google Maps, so that a place that catches my eye becomes a place I can find.
6. As a feed reader, I want the location tag to work even when the trip is not published, so that the tag is never a dead control.
7. As a feed reader, I want to tap the trip-title line to open the published trip, so that the trip door survives the tag's new job.
8. As a feed reader on an unpublished trip's postcard, I want the trip-title line untinted and inert, so that tint means tappable everywhere on the card.
9. As a diary author, I want my postcards' place to render as a tappable tag in my diary stream, so that my own record links back to the world.
10. As a traveler browsing a trip diary or a profile's diary tab, I want the postcard's place tag there too, so that the treatment is the same wherever a postcard renders.
11. As a diary author editing an entry, I want the place tag in the snapshot header to stay tappable, so that I can check the place mid-edit without leaving.
12. As a traveler tapping a postcard anywhere else on the card, I want it to open the entry as it does today, so that the tag's tap and the card's tap never fight.
13. As a traveler whose activity is called just "Big Lagoon", I want the search silently scoped by my trip's destination, so that Maps lands on the right lagoon.
14. As a founder testing on the web preview or LAN rung, I want the tap to open Maps in a new tab, so that the feature is verifiable on every rung.
15. As a screen-reader user, I want location links labelled "…, open in Google Maps", so that I know the tap leaves the app before I take it.
16. As a traveler with months of existing trips, I want every location I ever typed to become tappable with no action from me, so that the feature arrives already useful.

## Implementation Decisions

**The tap, and what it opens.**
- A location tap calls the platform opener with `https://www.google.com/maps/search/?api=1&query=<URL-encoded text>`. No key, no billing, no backend involvement — Maps performs a search and drops its own pin. We store no pin; free text stays the only location data (canon unchanged: ADR-013's described-landmark shape).
- **The destination-hint rule:** where the client holds the trip's destination, the query becomes `"<place>, <destination>"` — except when the place text already contains the destination (case-insensitive), to avoid "Big Lagoon, El Nido, El Nido, Palawan". This rule is a pure function and the heart of the story's testable logic. It resolves the one divergence between the grilling and the canvas README (which said feed tags query "as-is"): the grilling's Q19 ruling stands — bias wherever destination is known — with the contains-check as the refinement that makes both right.
- Two new pure seams, and only two: `mapsUrl` (query construction, encoding, the hint rule) and `openInMaps` as a `.native`/`.web` platform split (`Linking.openURL` / `window.open('_blank')` — no `Linking` use exists in the tree yet; the split is the codebase's standard pattern, and `window.open` from a tap handler is popup-blocker-safe).

**One affordance vocabulary (canvas ruling, normative).**
- Rest: place text tinted `#EA580C`, weight 600, no underline; pressed: ink `#C2410C`. Chips additionally swap their well `#FFF0EC → #FFE0D5`. No scale, no opacity, no added glyphs — the tag chips' existing pin is the only glyph, and plain-text links carry tint alone.
- New tokens `locationLink` / `locationLinkPressed`, plus `tagWellPressed`/`tagInkPressed` beside the feed tokens. **One link ink on every surface** — including the published view, whose own accent differs — because a link color is app-wide vocabulary, not surface identity.
- Single-line tail truncation everywhere; on split meta lines the clamp lives on the outer `Text` (RN cannot clamp a nested segment alone).
- Accessibility: every location link takes `accessibilityRole="link"` and the label `"<place>, open in Google Maps"`.

**Surface by surface.**
- **Workspace day card:** the activity meta line splits — the helper that joins "time • place" returns parts instead of one string, so the place segment alone becomes a nested-Text link while the clock and separator stay muted. The tap target is the text run itself (nested Text takes no hitSlop); the whole line is deliberately not wrapped, so a mis-tap on the time cannot open Maps. The clock format unifies on the diary's unpadded shape ("7:00 AM") while the line is being split.
- **Published Day-by-Day:** the activity place is already its own Text — it takes the link ink directly, query destination-hinted. The header's destination pill becomes a link to a Maps search of the destination itself, trading its navy fill for the link vocabulary (wash + link ink) — flagged deliberately: this re-colors a shipped element, because a solid-navy tappable pill reads as a filter chip, not a link.
- **Feed card (variant C, the founder's pick over A and B):** the location tag deletes its open-the-trip branch and always opens Maps. The trip-title line is the trip door — tappable when a published itinerary id is present, and **untinted** muted when not, fixing the shipped behavior where a dead trip line stayed tinted. A11y labels re-split accordingly.
- **Postcards:** the diary entry's `place` ships in the payload today and **no postcard surface renders it** — this story introduces the tag (feed treatment verbatim) on the diary stream entry, the trip-diary/profile postcard card, and the entry view's snapshot header. Skipped entirely when place is null — no layout ghost. The tag is a sibling pressable, never inside the card's existing summary press target. On the entry screen it is snapshot chrome, not a form field.

**The one wire change.**
- `FeedPostcardResponse` gains an additive `destination`, read live at query time exactly as `tripTitle` is — no snapshot question (postcard snapshots record what happened; the destination hint is a search aid, not a memory), no schema change, no migration, additive under ADR-008 with no waiver. It exists so the feed — the surface where strangers have zero context and a wrong pin embarrasses the product most — gets the hint too.

**What this story deliberately is not.**
- Candidate-capability note: **none** — opening an external Maps search is a free link, not footprint-growing, not governance; PL-2's vendor-billed suggestions are the recorded candidate for the gating seam.
- Freshness note: **no surface changes lanes** — all four families render already-fetched, pull-based data unchanged; the link is computed client-side at render/tap. Deliberately static.
- Measurement: **none, by founder ruling** — map-tap-through is client-side and mobile `track()` records nothing (the S4.37 finding); building an analytics endpoint for one counter is scope creep. The want is written into the PL-2 epic-map line as the evidence PL-2's case would use.

## Testing Decisions

- Good tests here assert **external behavior**: the URL handed to the opener, the rendered role/label/tint state, the response field on the wire — never component internals.
- **Pure modules carry the logic:** the query builder (encoding, the hint rule including the contains-check and the no-destination case) and the meta-line parts helper (clock formats, null place) get Jest tables in the existing `__tests__` style — the `landingSlot.ts`/`travelerCopy.ts` precedent of extracting the testable seam.
- **Feed unit tests update:** the tag's new target, the dead trip line's untint.
- **Playwright extends the existing suite:** intercept `window.open` in the fixture (the harness already auto-stubs dialogs — same family), then walk each surface and assert the captured URL's shape. Feed, published view, and diary walks each gain one assertion; specs import strings from `.ts` modules only (the S4.28 transform rule), and `npx playwright test --list` plus one full `npx jest` run before any push that adds `src/` files (the structural-guard rule).
- **Backend:** the postcard-feed IT table gains the `destination` assertion.
- **The rung no suite reaches:** a real tap opening the real Maps app. The LAN rung (real phone, real finger) closes it; the recorded workstation Gradle fault is budgeted per the gotcha — one diagnostic pass, not a session — and JS-only work stays walkable through Metro regardless.

## Out of Scope

- **Everything PL-2:** Places autocomplete, stored place IDs, exact pins via `query_place_id`, the `place` backend module with its ArchUnit boundary pilot, Google Cloud billing, per-traveler rate limiting, the picker UI. Parked whole on the epic map's geotag line with its trigger.
- In-app map rendering and pin-drop capture, in any form.
- Capture changes: the activity form and trip form keep their plain text fields and current placeholders.
- Trip cards' destination (collision: the card already opens the trip) and the workspace facts line (built at S4.25 and parked behind flags per ADR-028's amendment — if it is ever unparked, the destination there takes this story's link rule; the Details tab itself was deleted at S4.25 and stays deleted).
- Tap-through measurement (recorded want, PL-2 line).

## Further Notes

- **Decision provenance:** all rulings founder-made at the 2026-09-02 grilling — all-locations-tappable (retroactive coverage over pin certainty, reversing the agent's ref-only recommendation), variant C on the feed, destination tappable on published surfaces but not trip cards, billing deferred (which collapsed the scope from the full place-module story to this one), unmeasured v1, PL-1/PL-2 naming and sequencing (PL-1 runs before the itinerary-module rework).
- **The canvas is the design baseline** per the standing rule — read its markup for pixel answers. Its handoff README is archived beside it; where the README's query-scoping note diverged from the grilling, this spec's hint rule is the ruling. The canvas's `support.js` runtime is not archived (generated, carries no design information); the live canvas remains in the founder's Claude Design project.
- The activity form's "Search for a place..." placeholder stays as-is — it describes PL-2's capture feature and this story doesn't touch forms; whether it should soften in the interim is a PL-2-or-founder call, noted here so its survival is a decision, not an oversight.
