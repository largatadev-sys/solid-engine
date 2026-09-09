package com.largata.trip;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;


class NothingWritesTheDeadPublicationFlagTest {

    private static final Path MAIN = Path.of("src/main/java/com/largata");

    private static final Path THE_ENTITY =
            Path.of("src/main/java/com/largata/trip/trip/entity/Trip.java");

    private static final List<String> THE_WRITERS =
            List.of(".publishTo(", ".unpublish()", ".markPublishedAt(", ".markPublished(");


    @Test
    void noProductionCodeCallsTheEntitysPublicationFlagWriters() throws IOException {
        List<String> callers = callersOfTheWriters();

        assertThat(callers)
                .as("CM-5 made published mean an unretired ItineraryObject exists. The trip's"
                        + " published and published_at columns stay in place and DEAD, and the whole"
                        + " point is that there is one truth rather than two. A caller here is a"
                        + " second truth being written, and nothing would fail: the column simply"
                        + " starts disagreeing with the port, quietly, on whichever surface reads it")
                .isEmpty();
    }


    @Test
    void theGuardReadsRealSourceRatherThanPassingOnAnEmptyScan() throws IOException {
        assertThat(javaFiles().count())
                .as("a scan that found no files would pass this rule while guarding nothing")
                .isGreaterThan(200);
        assertThat(Files.readString(THE_ENTITY))
                .as("and the writers it names must still exist on the entity, or the rule is"
                        + " forbidding calls to methods nobody could write")
                .contains("publishTo(")
                .contains("unpublish()");
    }


    private static List<String> callersOfTheWriters() throws IOException {
        try (Stream<Path> files = javaFiles()) {
            return files.filter(file -> !file.equals(THE_ENTITY))
                    .flatMap(NothingWritesTheDeadPublicationFlagTest::linesCalling)
                    .toList();
        }
    }


    private static Stream<String> linesCalling(Path file) {
        try {
            return Files.readAllLines(file).stream()
                    .filter(line -> THE_WRITERS.stream().anyMatch(line::contains))
                    .map(line -> file + ": " + line.strip());
        } catch (IOException e) {
            throw new java.io.UncheckedIOException(e);
        }
    }


    private static Stream<Path> javaFiles() throws IOException {
        return Files.walk(MAIN).filter(path -> path.toString().endsWith(".java"));
    }
}
