# 11: join takes slices

**What to build:** `join` is 43 files — 18 at the root, 10 in `card/`, 12 in `web/`, `JoinPaths` in `api/` — and is the one module in this effort whose shape is `trip`'s rather than `postcard`'s. Three slices: the **link** (the token, the URL, the teaser a stranger sees), the **request** (the queue a stranger joins, its supersession when membership arrives), and the **card** (the Open Graph image and preview page). `api/` and `exception/` stay at the root; `JoinPaths` stays until issue 13.

**Proposed cut — the implementer confirms each assignment by reading the type's dependencies, not its name.** `JoinService` likely spans link and request; if it does, it lives with the table it writes and the other slice reaches it through an ordinary in-module call, or it splits along the same line — decide by reading, and record which in the commit message.

| Folder | Files |
|---|---|
| `api/` | `JoinPaths` (until issue 13) |
| `exception/` | `JoinExceptions`, `SignInRequiredException` |
| `link/` | `JoinLink`, `JoinLinkRepository`, `JoinLinkView`, `JoinTokens`, `JoinUrls`, `JoinTeaser`, `ViewerJoinState`, `JoinService` (if it writes the link), `JoinController`, `JoinLinkResponse`, `JoinTeaserResponse`, `OptionalViewer` |
| `request/` | `JoinRequest`, `JoinRequestRepository`, `JoinRequestStatus`, `MyJoinRequest`, `PendingJoinRequest`, `SupersedeOnMembershipArrival`, `JoinQueueTopic`, `TripJoinController`, `MyJoinRequestController`, `JoinRequestResponse`, `JoinRequestSummaryResponse`, `MyJoinRequestResponse` |
| `card/` | `JoinCard`, `JoinCardService`, `CardRenderer`, `CardArt`, `CardFonts`, `CardSubject`, `DestinationInitials`, `GenericCard`, `PreviewPage`, `PreviewSubject`, `TitleBlock`, `TripMetaLine`, `JoinCardController`, `CardUrls` |

Each slice passes ten files, so each takes the layer sub-folders (`controller/`, `dto/`, `entity/`, `repository/`, `service/`, `adapter/`), `trip/plan/` being the shape.

**A vestige to delete on the way.** `join/card/package-info.java` declares `@NamedInterface("card")`, and nothing outside `join` — main or test — imports `join.card`. It is a named interface with no consumer. Delete it and confirm `ModulithVerificationTest` still reports postcard alone; if Modulith starts refusing something in `join`, that is a finding to record, not a reason to keep the annotation.

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] The spec's done-checklist, in full
- [ ] `JoinModuleBoundaryTest` passes with its allowlist (`common`, `identity`, `invitation`, `media`, `trip`, `ws`) unchanged and both predicates selecting something
- [ ] `SupersedeOnMembershipArrival` keeps its event phase and its test passes unedited
- [ ] The card renderer's fonts and art assets are found from their new package — a resource path that was relative to the old package is the trap; the join-link Playwright spec's crawler block against a running preview is the external check
- [ ] `JoinLifecycleIT` passes unedited

## Comments
