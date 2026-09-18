package com.largata.trip.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;


class OnlyTheFenceMintsItsProofsTest {

    private static final Path MAIN = Path.of("src/main/java/com/largata");

    private static final Path THE_FENCE = Path.of("src/main/java/com/largata/trip/api/TripFence.java");

    private static final List<String> THE_PROOFS =
            List.of("InAudience", "Writable", "Editable", "MembershipMutable", "Unfrozen");


    @Test
    void everyProofsConstructorIsPrivate() throws IOException {
        String fence = Files.readString(THE_FENCE);

        for (String proof : THE_PROOFS) {
            assertThat(fence)
                    .as("%s is a proof the fence mints. A package-private constructor would let"
                            + " anything else in trip.api write one, which is the whole guarantee"
                            + " gone — the nestmate trick is what makes a forged proof impossible"
                            + " rather than merely discouraged", proof)
                    .contains("private " + proof + "(");
        }
    }


    @Test
    void nothingOutsideTheFenceConstructsOne() throws IOException {
        List<String> forgeries = forgeries();

        assertThat(forgeries)
                .as("a service that could write `new Editable<>(member)` could skip the check the"
                        + " proof exists to carry, and nothing would fail — the request would simply"
                        + " be allowed. Java refuses this at compile time; this rule is here so the"
                        + " refusal is READ as a rule rather than rediscovered as a compile error")
                .isEmpty();
    }


    @Test
    void theScanReadsRealSourceRatherThanPassingOnAnEmptyOne() throws IOException {
        assertThat(javaFiles().count())
                .as("a scan that found no files would pass while guarding nothing")
                .isGreaterThan(200);
        assertThat(Files.readString(THE_FENCE))
                .as("and the proofs it names must still be nested in the fence, or the rule forbids"
                        + " constructing types nobody could construct anyway")
                .contains("public static final class Editable<")
                .contains("public static final class Unfrozen");
    }


    private static List<String> forgeries() throws IOException {
        try (Stream<Path> files = javaFiles()) {
            return files.filter(file -> !file.equals(THE_FENCE))
                    .flatMap(OnlyTheFenceMintsItsProofsTest::forgeriesIn)
                    .toList();
        }
    }


    private static Stream<String> forgeriesIn(Path file) {
        try {
            return Files.readAllLines(file).stream()
                    .filter(
                            line ->
                                    THE_PROOFS.stream()
                                            .anyMatch(
                                                    proof ->
                                                            line.contains("new TripFence." + proof + "(")
                                                                    || line.contains("new TripFence." + proof + "<")))
                    .map(line -> file + ": " + line.strip());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }


    private static Stream<Path> javaFiles() throws IOException {
        return Files.walk(MAIN).filter(path -> path.toString().endsWith(".java"));
    }
}
