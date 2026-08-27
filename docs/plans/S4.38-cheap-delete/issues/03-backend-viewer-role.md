# 03 — Backend: viewerRole + memberCount on the itinerary summary

Status: resolved

The handoff's API blocker (design/README.md, "⚠️ API blocker"): the trips listing cannot tell whose trip a row is, and the delete-trip modal's acknowledgement needs a member count. Two **additive** fields on `ItineraryResponse` (ADR-008-safe; old clients ignore them):

- `viewerRole`: `"owner" | "member"` — the requesting traveler's role from the guard-resolved Membership. Never a second authority check and never a workspace-table read from the itinerary module: the role rides the Membership the guard already resolved, or crosses via the workspace service interface (ADR-002).
- `memberCount`: total members of the trip's workspace, over the same service interface.

Scope: the summary/list path the Trips screen reads, and the full view (one response type — both get the fields). Mobile types (`ItineraryResponse` in `types/api.ts`) gain the optional fields.

Acceptance:

1. Owner's listing rows carry `viewerRole: "owner"`; a member's carry `"member"`; both carry the correct `memberCount` (IT, owner + member perspective — `TripArchiveContractIT`'s two-perspective shape).
2. Existing ITs stay green untouched (additivity in practice).
3. `npx jest` full run before push (a new file under `src/` is invisible to `--changedSince` — the S4.28 rule) once the mobile type lands.

## Comments

- *2026-08-27, landed.* `ItineraryResponse` gained trailing nullable `viewerRole`/`memberCount`; the list controller fills them from two new bulk lookups the itinerary service delegates to the workspace service interface (`ownedAmong`, `memberCountsAmong` — the `archivedAmong` shape, empty-guarded; role spelled `name().toLowerCase()`, the `MemberResponse` precedent). The full-view builder passes null for both — the swipe lives on the list. Evidence: `TripListViewerRoleIT` (4 tests: owner row, member row on the same trip, solo count = 1, per-row roles in one page) plus `ItineraryListIT` + `TripArchiveContractIT` — **Tests run: 23, Failures: 0, Errors: 0**; `tsc --noEmit` clean; full `npx jest` **5111 passed**. P9: guard-resolved authority projected onto the wire, no inline checks; ADR-002 held by delegating through the service interfaces.
