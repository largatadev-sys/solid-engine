package com.largata.trip.room;

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


    private static final Pattern A_READ = Pattern.compile("@Transactional\\(readOnly = true\\)");


    private static final int BARE_STANDING_WRITES_AT_CLOSE = 7;


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
    void theBareStandingWritesAreTheOnesTheSpecNames() throws IOException {
        List<String> writes = bareStandingMethods(false);

        assertThat(writes)
                .as("the ratchet that matters: %s service method(s) WRITE while taking a standing with"
                        + " no state proof beside it. Decision 9 names four — archive, unarchive and"
                        + " destroy must reach a CLOSED room, and self-leave is S1.9's rule — and the"
                        + " other three are internal writes reached only from inside an act that"
                        + " already holds a proof (the history record, the lease release a holder must"
                        + " always be able to make, and the session check the lifecycle acts call).%n%s",
                        writes.size(),
                        String.join(System.lineSeparator(), writes))
                .hasSizeLessThanOrEqualTo(BARE_STANDING_WRITES_AT_CLOSE);
    }


    @Test
    void theReadsThatTakeABareStandingAreCountedToo_soTheyCannotDriftEither() throws IOException {
        List<String> all = bareStandingMethods(null);

        assertThat(all)
                .as("%s method(s) in total. The reads are listed rather than exempted: Decision 9 says"
                        + " reads on a workspace take InAudience, and each of these is a read the"
                        + " controller has already fenced before calling — but that is a claim about"
                        + " call sites, which is exactly the kind of claim that rots. Printing them"
                        + " keeps the claim visible; the number must fall rather than grow.%n%s",
                        all.size(),
                        String.join(System.lineSeparator(), all))
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


    private static List<String> bareStandingMethods(Boolean readOnly) throws IOException {
        try (Stream<Path> files = javaFiles()) {
            return files.filter(file -> file.toString().endsWith("Service.java"))
                    .flatMap(file -> bareStandingMethodsIn(file, readOnly))
                    .toList();
        }
    }


    private static Stream<String> bareStandingMethodsIn(Path file, Boolean readOnly) {
        try {
            List<String> lines = Files.readAllLines(file);
            List<String> found = new java.util.ArrayList<>();
            for (int at = 0; at < lines.size(); at += 1) {
                if (!A_BARE_STANDING_METHOD.matcher(lines.get(at)).find()) {
                    continue;
                }
                boolean isRead = at > 0 && A_READ.matcher(lines.get(at - 1)).find();
                if (readOnly == null || readOnly == isRead) {
                    found.add(file.getFileName() + ": " + lines.get(at).strip());
                }
            }
            return found.stream();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
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
