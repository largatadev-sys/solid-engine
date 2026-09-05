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
            Path.of("src/main/java/com/largata/itinerary/ItineraryRepository.java");

    private static final Pattern NOT_ARCHIVED =
            Pattern.compile("i[.]id <> ALL [(]CAST[(]:archivedIds AS uuid\\[\\][)][)]");


    @Test
    void theStrangersSurfaceIsWrittenInExactlyOnePlace() throws IOException {
        String source = Files.readString(REPOSITORY);

        assertThat(occurrences(source))
                .as(
                        "Discovery's scope — published AND not archived (ADR-034 retired the third "
                                + "clause) — decides what a stranger sees. Every hand-written copy is a place "
                                + "it can drift, and a drifted copy fails NOTHING: the query still runs, still "
                                + "returns rows, and the wrong ones are simply present. It lives in "
                                + "ON_THE_STRANGERS_SURFACE; concatenate that, never retype it")
                .isEqualTo(1);
    }


    @Test
    void everyDiscoveryQueryBuildsOnThatOneDefinition() throws IOException {
        String source = Files.readString(REPOSITORY);

        assertThat(source.split("ON_THE_STRANGERS_SURFACE", -1).length - 1)
                .as("the definition plus one reference per discovery query — browse, count, "
                        + "recommended, trending, and both suggestion groups")
                .isGreaterThanOrEqualTo(6);
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
