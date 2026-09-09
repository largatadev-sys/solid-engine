package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;


class DiscoveryScopeIsDefinedOnceTest {

    private static final Path REPOSITORY =
            Path.of("src/main/java/com/largata/itinerary/repository/ItineraryDiscoveryRepository.java");

    private static final Pattern NOT_ARCHIVED =
            Pattern.compile("o[.]trip_id <> ALL [(]CAST[(]:excludedTripIds AS uuid\\[\\][)][)]");


    @Test
    void theStrangersSurfaceIsWrittenInExactlyOnePlace() throws IOException {
        String source = Files.readString(REPOSITORY);

        assertThat(occurrences(source))
                .as(
                        "the scope decides what a reader sees, and a hand-written copy fails NOTHING"
                                + " - the query still runs, still returns rows, and the wrong ones are"
                                + " simply present (S4.39's count-vs-list bug was exactly this). There are"
                                + " TWO scopes and so two definitions: DISCOVERABLE for the strangers"
                                + " surface, OWNED_AND_LIVE for a traveler's own showcase. Every query"
                                + " concatenates one of them; a third occurrence is a retyped copy")
                .isEqualTo(2);
    }


    @Test
    void everyDiscoveryQueryBuildsOnThatOneDefinition() throws IOException {
        String source = Files.readString(REPOSITORY);

        assertThat(source.split("DISCOVERABLE", -1).length - 1)
                .as("the definition plus one reference per discovery query — browse, count, "
                        + "recommended, trending, and both suggestion groups")
                .isGreaterThanOrEqualTo(5);
    }


    private static int occurrences(String source) {
        Matcher found = NOT_ARCHIVED.matcher(source);
        int seen = 0;
        while (found.find()) {
            seen += 1;
        }
        return seen;
    }
}
