package com.largata.trip.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;


class StandingIsMintedAndDemandedTest {

    private static final Path MAIN = Path.of("src/main/java/com/largata");

    private static final Path THE_RESOLVER =
            MAIN.resolve("trip/workspace/adapter/RowBackedMembershipResolver.java");


    private static final Pattern MINTS_A_STANDING =
            Pattern.compile("new (com[.]largata[.]trip[.]api[.])?Membership\\(\\s*[a-zA-Z]");


    private static final Pattern A_BARE_STANDING_METHOD =
            Pattern.compile("public [A-Za-z<>,.? \\[\\]]+ ([a-zA-Z]+)\\((Membership|Owner) ");


    private static final int BARE_STANDING_METHODS_AT_CLOSE = 15;


    @Test
    void onlyTheResolverMintsAMembership() throws IOException {
        List<String> minters = minters();

        assertThat(minters)
                .as("a Membership is the answer to `what standing does this traveler have on this"
                        + " trip`, and the resolver is the one thing that can answer it — it reads the"
                        + " row. Anything else constructing one is ASSERTING a standing rather than"
                        + " resolving it, and every proof minted from it would be built on that"
                        + " assertion. The workspace ENTITY of the same name is a different type and"
                        + " is deliberately not covered here.%n%s",
                        String.join(System.lineSeparator(), minters))
                .isEmpty();
    }


    @Test
    void theBareStandingListIsARatchetRatherThanASet() throws IOException {
        List<String> bare = bareStandingMethods();

        assertThat(bare)
                .as("a ratchet: %s service method(s) take a standing with no state proof beside it."
                        + " Each is deliberate — archive, unarchive and destroy must reach a CLOSED"
                        + " room; self-leave is S1.9's rule; the rest are reads and internal helpers"
                        + " that no door governs. The list is printed rather than held as a set, so"
                        + " adding one is visible in the failure and removing one just makes the"
                        + " number smaller. It must never grow.%n%s",
                        bare.size(),
                        String.join(System.lineSeparator(), bare))
                .hasSizeLessThanOrEqualTo(BARE_STANDING_METHODS_AT_CLOSE);
    }


    @Test
    void theScanReadsRealSourceAndTheResolverStillMintsOne() throws IOException {
        assertThat(javaFiles().count())
                .as("a scan that found no files would pass both rules while guarding nothing")
                .isGreaterThan(200);
        assertThat(MINTS_A_STANDING.matcher(Files.readString(THE_RESOLVER)).find())
                .as("…and the resolver must still mint one, or the first rule forbids something"
                        + " nothing does")
                .isTrue();
    }


    private static List<String> minters() throws IOException {
        try (Stream<Path> files = javaFiles()) {
            return files.filter(file -> !file.equals(THE_RESOLVER))
                    .filter(file -> !file.toString().contains("workspace"))
                    .flatMap(file -> matching(file, MINTS_A_STANDING))
                    .toList();
        }
    }


    private static List<String> bareStandingMethods() throws IOException {
        try (Stream<Path> files = javaFiles()) {
            return files.filter(file -> file.toString().endsWith("Service.java"))
                    .flatMap(file -> matching(file, A_BARE_STANDING_METHOD))
                    .toList();
        }
    }


    private static Stream<String> matching(Path file, Pattern pattern) {
        try {
            return Files.readAllLines(file).stream()
                    .filter(line -> pattern.matcher(line).find())
                    .map(line -> file.getFileName() + ": " + line.strip());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }


    private static Stream<Path> javaFiles() throws IOException {
        return Files.walk(MAIN).filter(path -> path.toString().endsWith(".java"));
    }
}
