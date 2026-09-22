package com.largata.trip.room;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;


class OnlyTheFenceRefusesTest {

    private static final Path MAIN = Path.of("src/main/java/com/largata");

    private static final Path THE_FENCE = MAIN.resolve("trip/room/TripFence.java");

    private static final Path THE_OWNER_REFUSAL =
            MAIN.resolve("trip/exception/NotTheTripOwnerException.java");


    private static final List<String> THE_FREEZE_REFUSALS =
            List.of("ItineraryPublishedException(", "MembershipFrozenException(");


    private static final int OWNER_REFUSALS_AT_CLOSE = 0;


    @Test
    void onlyTheFenceConstructsAFreezeRefusal() throws IOException {
        List<String> elsewhere =
                linesConstructing(THE_FREEZE_REFUSALS, THE_FENCE).stream()
                        .filter(line -> !line.contains("trip" + java.io.File.separator + "exception"))
                        .toList();

        assertThat(elsewhere)
                .as("the two freeze refusals are the fence's answers, and a surface that constructs"
                        + " one has re-derived the fact behind it — which is exactly the nine hand"
                        + " copies TW-2 set out to remove. A surface that wants its OWN wording says"
                        + " so through the refusal overload (chat's CHAT_CLOSED, join's"
                        + " JOIN_LINK_CLOSED) rather than deciding for itself when to throw")
                .isEmpty();
    }


    @Test
    void everyOwnerRefusalIsANamedFactoryRatherThanAStringAtACallSite() throws IOException {
        List<String> constructions =
                linesConstructing(List.of("new NotTheTripOwnerException("), THE_OWNER_REFUSAL);

        assertThat(constructions)
                .as("a ratchet, not a set: %s ad-hoc construction(s) of the owner refusal outside the"
                        + " exception itself. Every owner refusal is a NAMED FACTORY on that class, so"
                        + " each act's wording lives in exactly one place and a call site cannot"
                        + " quietly reword it. TW-2 took this to zero by naming the last four (edit"
                        + " details, add or remove days, delete, publish/unpublish/preview); the"
                        + " number must fall rather than drift upward.%n%s",
                        constructions.size(),
                        String.join(System.lineSeparator(), constructions))
                .hasSizeLessThanOrEqualTo(OWNER_REFUSALS_AT_CLOSE);
    }


    @Test
    void theScanReadsRealSourceRatherThanPassingOnAnEmptyOne() throws IOException {
        assertThat(javaFiles().count())
                .as("a scan that found no files would pass every rule above while guarding nothing")
                .isGreaterThan(200);
        assertThat(Files.readString(THE_FENCE))
                .as("and the refusals it pins must still be thrown by the fence, or the rule forbids"
                        + " constructing exceptions nobody constructs")
                .contains("ItineraryPublishedException::new")
                .contains("MembershipFrozenException::new");
    }


    private static List<String> linesConstructing(List<String> needles, Path allowed) throws IOException {
        try (Stream<Path> files = javaFiles()) {
            return files.filter(file -> !file.equals(allowed))
                    .flatMap(file -> linesOf(file, needles))
                    .toList();
        }
    }


    private static Stream<String> linesOf(Path file, List<String> needles) {
        try {
            return Files.readAllLines(file).stream()
                    .filter(line -> needles.stream().anyMatch(line::contains))
                    .map(line -> file + ": " + line.strip());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }


    private static Stream<Path> javaFiles() throws IOException {
        return Files.walk(MAIN).filter(path -> path.toString().endsWith(".java"));
    }
}
