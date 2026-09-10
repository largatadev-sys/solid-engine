# 05: feed takes layers, and its three wire records leave `api/`

**What to build:** `feed` is the Home composition module (ADR-039 decision 4). Its `api/` holds three response records, all wire. They move to `dto/`, `api/` is deleted, the service takes `service/` and the exceptions `exception/`.

| Folder | Files |
|---|---|
| `controller/` | `PostcardFeedController` |
| `dto/` | `FeedPostcardResponse`, `FeedPhotoResponse`, `PublicTripDiaryResponse` |
| `exception/` | `FeedExceptions` |
| `service/` | `PostcardFeedService` |

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] The spec's done-checklist, in full
- [ ] `feed/api/` and its `package-info.java` are gone; `FeedModuleBoundaryTest` loses its contract rule, keeps the outside-in rule, and says why
- [ ] The module still owns no table and no SQL; `postcard.api`'s `feedPageOf` stays the query and feed stays the composer
- [ ] The Playwright feed specs against the local stack are the external check if any doubt about the wire remains

## Comments
