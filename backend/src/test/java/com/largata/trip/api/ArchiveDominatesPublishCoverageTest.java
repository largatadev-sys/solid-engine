package com.largata.trip.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;


class ArchiveDominatesPublishCoverageTest {

    private static final Path MAIN = Path.of("src/main/java/com/largata");

    private static final List<String> THE_CONSULTS =
            List.of("archivedAmong(", "allArchivedTripIds(", "isArchived(", "excludedTripIds");


    private static final Map<String, String> THE_SCOPE =
            Map.of(
                    "itinerary/service/ItineraryObjectService.java",
                            "GET /v1/itineraries/{id} and /by-trip/{tripId} — the published Itinerary page itself",
                    "itinerary/service/ItineraryDiscoveryService.java",
                            "GET /v1/discover and its counts — every list of published Itineraries",
                    "discovery/service/DiscoveryService.java",
                            "the Discover surface that composes those lists",
                    "profile/service/PublicProfileService.java",
                            "GET /v1/travelers/{handle} — the itineraries tab and the two counts beside it",
                    "feed/service/PostcardFeedService.java",
                            "GET /v1/feed and the public trip diary — the LINK on a postcard card, which"
                                    + " must be omitted rather than point at a page that 404s",
                    "join/join/service/JoinService.java",
                            "GET /v1/join/{token} — the teaser's closed answer",
                    "itinerary/service/ItinerarySourceVisibility.java",
                            "the fork source check — a deleted trip's page cannot be forked from");


    @Test
    void everySurfaceInTheScopeConsultsTheArchivedSet() throws IOException {
        for (Map.Entry<String, String> surface : THE_SCOPE.entrySet()) {
            String source = Files.readString(MAIN.resolve(surface.getKey().replace("com/largata/", "")));

            assertThat(THE_CONSULTS.stream().anyMatch(source::contains))
                    .as(
                            "%s is in the reader-side scope of ADR-040's `archive dominates publish`"
                                + " — %s. No proof can be demanded of a stranger reading Discover, so"
                                + " these surfaces consult the trip module's archived set instead, and"
                                + " a reader that stops consulting it shows a page that answers 404 at"
                                + " the link. Nothing FAILS when one drops the consult: the query still"
                                + " runs and returns the wrong rows, which is why this rule is a"
                                + " property of the source rather than of a request",
                            surface.getKey(),
                            surface.getValue())
                    .isTrue();
        }
    }


    @Test
    void theScopeIsExactlyTheSurfacesTheGrillingNamed() {
        assertThat(THE_SCOPE.keySet())
                .as("Q10 narrowed this rule to the published Itinerary and every LINK to it, and"
                        + " nothing else — the record itself (postcards, diary sections, Home, the"
                        + " profile's diary tab) deliberately survives a deleted trip. A surface"
                        + " added here means a reader newly hides the record; a surface removed"
                        + " means a link newly points at a 404")
                .hasSize(7);
    }


    @Test
    void eachNamedSurfaceCarriesAReasonRatherThanJustAPath() {
        for (Map.Entry<String, String> surface : THE_SCOPE.entrySet()) {
            assertThat(surface.getValue())
                    .as("%s — a scope entry without the route it protects is a path nobody can check",
                            surface.getKey())
                    .isNotBlank();
        }
    }


    @Test
    void theScanReadsRealSourceRatherThanPassingOnMissingFiles() throws IOException {
        for (String file : THE_SCOPE.keySet()) {
            Path path = MAIN.resolve(file.replace("com/largata/", ""));
            assertThat(Files.exists(path))
                    .as("%s has moved or been deleted, so this rule is guarding a file that is not"
                            + " there — which would pass silently if the read were wrapped", file)
                    .isTrue();
            assertThat(Files.readString(path).length()).isGreaterThan(200);
        }
    }
}
