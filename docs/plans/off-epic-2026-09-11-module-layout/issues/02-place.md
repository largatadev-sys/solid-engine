# 02: place takes layers, and its suggester seam moves inward

**What to build:** the `place` module reads in the converted shape and place search answers exactly as it does today, on the local stack with the fixture suggester and on `dev` with Photon. `PlaceSuggester` is a real seam — two adapters chosen by a property expression — but nothing outside the module calls it, so it is an internal seam and lives inside: the interface and its two records in `service/`, the adapters and their configuration in `adapter/`, the two exceptions in `exception/`. `api/` goes. A `PlaceApi` is minted the day `trip` needs places in-process; a seam earns `api/` when its second side exists.

**The move.** `controller/`: `PlaceSearchController`, `MapConfigController`. `dto/`: `PlaceSearchResponse`, `PlaceCandidateResponse`, `MapConfigResponse`. `exception/`: `PlaceSearchUnavailableException`, `TooManySearchesException`. `service/`: `PlaceSearchService`, `SearchRateLimiter`, `SuggestionCache`, `PlaceSuggester`, `PlaceCandidate`, `ResolvedPlace`. `adapter/`: `FixturePlaceSuggester`, `PhotonPlaceSuggester`, `PlaceSuggesterConfig` — the configuration reads two package-private constants on the Photon adapter, so all three stay in one package. The two unit tests follow their subjects.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Every main-tree class of the module sits in a target folder and the module root holds none
- [x] `api/` and its `package-info` are gone; the boundary test loses its contract rule on the ticket 01 pattern, keeps the outside-in rule, and is sabotage-checked with a real usage
- [x] `ModuleCycleTest.theModulesThatDependOnNothingElseStayThatWay` still names `place` and still passes
- [x] Suggester selection is proven after the move, not assumed: the Photon URL set selects Photon, unset selects the fixture, and the fixture refuses when it is not allowed — by the existing unit tests, unedited
- [x] The Photon client's outbound transport is still stated where the client is built
- [x] No test changes but its package line and imports
- [x] The spec's verification loop, in full, and the structural guards green
- [x] The last commit sets this ticket `resolved` and flips its ledger glyph; the PR is opened, never merged unasked

## Comments

**2026-09-11 — one widening kept deliberately, raised at the series' code review (standards axis).**

`FixturePlaceSuggester` is `public` while its sibling `PhotonPlaceSuggester` is package-private, and ADR-038 rule 3 says an adapter *"keeps the implementing class package-private, so the concrete service is unreachable by construction rather than only by the guard."*

**The reason is a test, and that is the weakness.** `PlaceSearchServiceTest` drives `PlaceSearchService` through the fixture suggester; the test's subject is the service, so it sits in `service/` while the fixture sits in `adapter/` — cross-package. The alternatives are worse or forbidden: moving the test to `adapter/` puts it away from its subject, and replacing the fixture with an inline stub is a test change beyond the package line and imports, which this spec forbids.

**So it is recorded, not defended.** The boundary guard still seals the module from outside; what is lost is compile-time unreachability *within* `place`. **The ten other types this series widened unnecessarily were reverted** at the same review; this is the one that a compiler check does not clear.

