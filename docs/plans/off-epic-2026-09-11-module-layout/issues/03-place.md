# 03: place takes layers, and its internal seam moves inward

**What to build:** `place` moves onto the layer folders and its `api/` is deleted. `PlaceSuggester` is a real seam — two adapters, `FixturePlaceSuggester` and `PhotonPlaceSuggester`, chosen by configuration — but nobody outside the module calls it, so it is an internal seam and lives in `service/` with its two records; the adapters and their config go to `adapter/`; the two exceptions go to `exception/`. If `trip` ever needs places in-process, a `PlaceApi` is minted then; a seam earns `api/` when its second side exists.

| Folder | Files |
|---|---|
| `controller/` | `PlaceSearchController`, `MapConfigController` |
| `dto/` | `PlaceSearchResponse`, `PlaceCandidateResponse`, `MapConfigResponse` |
| `exception/` | `PlaceSearchUnavailableException`, `TooManySearchesException` |
| `service/` | `PlaceSearchService`, `SearchRateLimiter`, `SuggestionCache`, `PlaceSuggester`, `PlaceCandidate`, `ResolvedPlace` |
| `adapter/` | `FixturePlaceSuggester`, `PhotonPlaceSuggester`, `PlaceSuggesterConfig` |

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] The spec's done-checklist, in full
- [ ] `place/api/` and its `package-info.java` are gone; `PlaceModuleBoundaryTest` loses its contract rule, keeps the outside-in rule, and says why
- [ ] `ModuleCycleTest.theModulesThatDependOnNothingElseStayThatWay` still names `place` and still passes
- [ ] `PlaceSuggesterGuardTest` and `PlaceSearchServiceTest` follow their subjects' packages; the suggester selection (`LARGATA_PHOTON_URL` set → Photon, unset → fixture) is proven by those tests after the move, not assumed
- [ ] The Photon client's outbound transport is stated where the client is built, unchanged

## Comments
