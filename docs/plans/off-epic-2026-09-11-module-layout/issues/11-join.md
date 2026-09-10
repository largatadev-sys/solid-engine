# 11: join takes two slices: `join` and `card`

**What to build:** the join module reads in `trip`'s shape and every join path behaves exactly as it does today: a link is minted and opened signed-out, a request is made through it, approved or declined, superseded when membership arrives another way, and the Open Graph card unfurls. The dependency map settled the cut: a request is made through a link, one service writes both tables, and nothing in the card renderer touches those tables — so the module has one real seam, join-versus-card, and the slices say so. No class is split. Two things found on the way go with the move: the service's event-publisher injection that is assigned and never read, and the `card` named interface that nothing outside the module consumes. `JoinPaths` stays in `api/` until ticket 13 retires it.

**The move.** Root — `api/`: `JoinPaths`. `exception/`: `JoinExceptions`, `SignInRequiredException`. `join/` folded into layer sub-folders, every folder under ten — `controller/`: `JoinController`, `TripJoinController`, `MyJoinRequestController`, `OptionalViewer`; `dto/`: `JoinLinkResponse`, `JoinTeaserResponse`, `JoinRequestResponse`, `JoinRequestSummaryResponse`, `MyJoinRequestResponse`; `entity/`: `JoinLink`, `JoinRequest`, `JoinRequestStatus`; `repository/`: `JoinLinkRepository`, `JoinRequestRepository`; `service/`: `JoinService`, `JoinLinkView`, `JoinTeaser`, `ViewerJoinState`, `MyJoinRequest`, `PendingJoinRequest`, `JoinTokens`, `JoinUrls`; `adapter/`: `SupersedeOnMembershipArrival`, `JoinQueueTopic`. `card/` folded — `controller/`: `JoinCardController`, `CardUrls`; `service/`: `JoinCard`, `JoinCardService`, `CardRenderer`, `CardArt`, `CardFonts`, `CardSubject`, `DestinationInitials`, `GenericCard`, `PreviewPage`, `PreviewSubject`, `TitleBlock`, `TripMetaLine` — twelve types, one algorithm, the boundary case "around ten" tolerates. The `trip/trip/` namesake-slice precedent applies to `join/join/`.

**Blocked by:** None (can start immediately).

**Status:** claimed

- [ ] Every main-tree class of the module sits in a slice folder or a root folder and the module root holds none; no class is split
- [ ] The never-read event-publisher field and its constructor parameter are deleted; the `card` `package-info` is deleted and `ModulithVerificationTest` still refuses postcard alone — if Modulith starts refusing something in `join`, that is a finding to record, not a reason to keep the annotation
- [ ] The boundary test passes with its allowlist (`common`, `identity`, `invitation`, `media`, `trip`, `ws`) unchanged and both predicates still selecting something
- [ ] `SupersedeOnMembershipArrival` keeps its event phase and its test passes unedited
- [ ] The card's fonts and art are found from their new package — a resource path relative to the old package is the trap; the join-link crawler block in the Playwright suite against a running preview is the external check
- [ ] The four test files importing `JoinPaths` or reaching the join routes keep working unchanged; `JoinPaths` itself does not move
- [ ] No test changes but its package line and imports; the join lifecycle IT passes unedited
- [ ] The spec's verification loop, in full, and the structural guards green
- [ ] The last commit sets this ticket `resolved` and flips its ledger glyph; the PR is opened, never merged unasked

## Comments
