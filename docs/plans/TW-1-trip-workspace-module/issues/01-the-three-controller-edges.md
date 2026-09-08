# 01: The three controller edges are cut before anything moves

**What to build:** three seams the move would otherwise have to cut mid-flight, cut now so every move commit that follows is a pure move the review can read as one. Nothing relocates in this ticket and no route string changes; a traveler on any app version sees nothing.

First, the owner's preview of the itinerary a publish would create leaves the trip controller for the controller that already serves published itineraries and stays in the old package — because the trip controller moves and the service behind preview does not, and a moved file may not name the old world. Second, the five routes that drive membership acts — the roster, offering ownership, revoking it, accepting it, declining it, and removing a member or departing — leave the invitation controller for a controller of their own that will travel with the ownership slice, keeping both roots the grammar story gave them; the four invitation routes stay where they are. Third, the trip module's existing destruction-only controller takes the name it will need, so the rename ticket has a free target for the trip controller.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] The preview route is served by a controller that stays in the old package, and the trip controller no longer names the published-itinerary service or its response
- [x] The membership and ownership routes are served by a controller that names no invitation type; the invitation routes are served by a controller that names no membership type; both carry both roots
- [x] The destruction controller has a name that does not collide with the rename's target
- [x] The twin test and the equivalence test from the grammar story pass with no edit
- [x] Every route on both grammars answers exactly as before, proven by the existing integration tests passing with no edited assertion and both Playwright lanes untouched
- [x] No file has moved between packages

## Comments

**2026-09-08 — built.** The three edges are cut with **zero test files touched** — the whole ticket is main-source only, which is the strongest form of the "no edited assertion" criterion.

*Preview.* A `PublishPreviewController` in the old package carries `GET /{id}/preview` on both roots; `ItineraryController` loses the route, the `PublishedItineraryService` field and both imports. It could not join the existing `PublishedItineraryController`, which is mapped at `/v1/published-itineraries` — a different root.

*The split.* `TripMembershipController` was one class in `invitation.web` driving two services. It is now `invitation/web/TripInvitationController` (the three invitation routes, naming no membership type) and `membership/web/TripMembershipController` (the roster, the four ownership-offer routes and the departure, naming no invitation type). **The roster read had to move with it:** `members()` lived on `InvitationService` but is a pure read over `workspaces.membersOf` plus traveler profiles — no invitation row in it — so it moved to `MembershipService` along with `MemberSummary`, and `MemberResponse` and `OwnershipOfferRequest` moved to `membership/web`. `InvitationService` lost `members`, `memberSummaryOf` and the now-orphaned `profileOf` with its `ProfileVisibility` import. `MemberResponse.of(m)`'s single-argument overload had no caller and went with the move. This is what ticket 03's `MembershipApi.membersOf` will be built over.

*The rename.* `trip/controller/TripController` → `TripDestructionController`, leaving the name free for ticket 09.

*Verified:* `TripGrammarTwinIT` + `TripGrammarEquivalenceIT` **12/12 unedited** — the twin test compares handler *identity*, so a split controller passes only because each twin pair is still one Java method. Membership + invitation ITs **171/171**, publish/preview ITs **38/38**, all with no edited assertion.
