# 02: place takes layers, and its suggester seam moves inward

**What to build:** the `place` module reads in the converted shape and place search answers exactly as it does today, on the local stack with the fixture suggester and on `dev` with Photon. `PlaceSuggester` is a real seam — two adapters chosen by a property expression — but nothing outside the module calls it, so it is an internal seam and lives inside: the interface and its two records in `service/`, the adapters and their configuration in `adapter/`, the two exceptions in `exception/`. `api/` goes. A `PlaceApi` is minted the day `trip` needs places in-process; a seam earns `api/` when its second side exists.

**The move.** `controller/`: `PlaceSearchController`, `MapConfigController`. `dto/`: `PlaceSearchResponse`, `PlaceCandidateResponse`, `MapConfigResponse`. `exception/`: `PlaceSearchUnavailableException`, `TooManySearchesException`. `service/`: `PlaceSearchService`, `SearchRateLimiter`, `SuggestionCache`, `PlaceSuggester`, `PlaceCandidate`, `ResolvedPlace`. `adapter/`: `FixturePlaceSuggester`, `PhotonPlaceSuggester`, `PlaceSuggesterConfig` — the configuration reads two package-private constants on the Photon adapter, so all three stay in one package. The two unit tests follow their subjects.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [ ] Every main-tree class of the module sits in a target folder and the module root holds none
- [ ] `api/` and its `package-info` are gone; the boundary test loses its contract rule on the ticket 01 pattern, keeps the outside-in rule, and is sabotage-checked with a real usage
- [ ] `ModuleCycleTest.theModulesThatDependOnNothingElseStayThatWay` still names `place` and still passes
- [ ] Suggester selection is proven after the move, not assumed: the Photon URL set selects Photon, unset selects the fixture, and the fixture refuses when it is not allowed — by the existing unit tests, unedited
- [ ] The Photon client's outbound transport is still stated where the client is built
- [ ] No test changes but its package line and imports
- [ ] The spec's verification loop, in full, and the structural guards green
- [ ] The last commit sets this ticket `resolved` and flips its ledger glyph; the PR is opened, never merged unasked

## Comments
