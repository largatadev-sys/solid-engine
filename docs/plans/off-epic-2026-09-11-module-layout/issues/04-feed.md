# 04: feed takes layers

**What to build:** the Home feed's module reads in the converted shape and Home renders exactly as it does today. `feed` is a composition module; its `api/` holds three response records, all wire. They move to `dto/`, `api/` goes with its named interface, the service takes `service/` and the exceptions `exception/`. `postcard`'s `feedPageOf` stays the query and feed stays the composer.

**The move.** `controller/`: `PostcardFeedController`. `dto/`: `FeedPostcardResponse`, `FeedPhotoResponse`, `PublicTripDiaryResponse`. `exception/`: `FeedExceptions`. `service/`: `PostcardFeedService`.

**Blocked by:** None (can start immediately).

**Status:** claimed

- [ ] Every main-tree class of the module sits in a target folder and the module root holds none
- [ ] `api/` and its `package-info` are gone; the boundary test loses its contract rule on the ticket 01 pattern, keeps the outside-in rule, and is sabotage-checked with a real usage
- [ ] The module still owns no table and no SQL
- [ ] The feed ITs pass unedited; the Playwright feed specs against the local stack are the external check if any doubt about the wire remains
- [ ] The spec's verification loop, in full, and the structural guards green
- [ ] The last commit sets this ticket `resolved` and flips its ledger glyph; the PR is opened, never merged unasked

## Comments
