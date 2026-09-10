# 03: The client opens Itineraries by their own id

**What to build:** the Itinerary's id becomes the address the app uses everywhere a traveler opens a published page. The published screen reads the widened Itinerary read by that id and renders the creator, cost, days, photos, fork count and provenance from it. A link that carries a trip id — every link shared before this story — still opens: the screen tries the Itinerary read, then the by-trip read, then rewrites its own address to the Itinerary's id, a courtesy whose end is a dated line on the epic map. From the workspace, the row's tap, the share link and "view published" navigate by the trip record's new `itineraryId`; the badge, the settings items and the row's published state keep reading the trip record as before. Discovery cards and feed links keep their navigation shape, ready for the ids they will carry from tickets 05 and 06.

**Blocked by:** 02 (The Itinerary read becomes the page).

**Status:** ready-for-agent

- [x] The published page renders from the Itinerary read by the Itinerary's id — creator, estimated cost, days and activities, photos, fork count and provenance included — and the old projection route has no caller left in the app
- [x] A link carrying a trip id opens the page and the address becomes the Itinerary's id; a link carrying an id that is neither answers the page's not-found state
- [x] From the workspace, the row's tap, the share link and "view published" carry the Itinerary's id; the badge and settings items still read the trip record
- [x] The client's trip-grammar guard asserts that the only old-root paths left in any repository are the diary's and the fork's
- [x] Playwright, both lanes: publish, open the page, share the link, open a trip-id link and see it rewrite
- [ ] The courtesy fallback has a test that names its epic-map end in the test's title
