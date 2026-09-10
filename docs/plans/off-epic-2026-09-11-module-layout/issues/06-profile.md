# 06: profile takes layers, and its three wire records leave `api/`

**What to build:** `profile` is the third composition module. Its `api/` holds `DiaryTripResponse`, `ProfileStatsResponse` and `ShowcaseItineraryResponse`, all wire. They move to `dto/`, `api/` is deleted, the two controllers take `controller/` and the service `service/`.

| Folder | Files |
|---|---|
| `controller/` | `MyProfileController`, `PublicProfileController` |
| `dto/` | `DiaryTripResponse`, `ProfileStatsResponse`, `ShowcaseItineraryResponse` |
| `service/` | `PublicProfileService` |

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] The spec's done-checklist, in full
- [ ] `profile/api/` and its `package-info.java` are gone; `ProfileModuleBoundaryTest` loses its contract rule, keeps the outside-in rule, and says why
- [ ] The module still owns no table and no SQL
- [ ] The four `Follow*` types profile imports from `identity` are unchanged by this issue — the identity split is a story, and this move must not pre-empt it by, for instance, copying a follow view into profile

## Comments
