package com.largata.support;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;


class NewWorldBoundaryTest {

    private static final List<String> NEW_WORLD = List.of("trip", "diary", "postcard", "publication");

    private static final Pattern OLD_WORLD =
            Pattern.compile(
                    "com\\.largata\\.(itinerary|invitation|join|chat|poll|ws"
                            + "|verification|report|health)\\.");

    private static final Pattern THE_CONTENT_HALF_TW1_LEFT_STANDING =
            Pattern.compile(
                    "com\\.largata\\.itinerary\\.(PublishedVisibility"
                            + "|api\\.ShowcaseItineraryResponse)\\b");

    @Test
    void newWorldSourcesNeverNameAnOldWorldPackage() {
        List<String> offenders =
                newWorldFiles()
                        .flatMap(NewWorldBoundaryTest::offendingLines)
                        .filter(line -> !THE_CONTENT_HALF_TW1_LEFT_STANDING.matcher(line).find())
                        .toList();

        assertThat(offenders)
                .as(
                        "the CM-1 modules may reach common, identity, media and each other — never a"
                                + " frozen old-world package; the rewire story deletes the old world"
                                + " and this guard with it")
                .isEmpty();
    }

    @Test
    void theContentHalfExemptionIsTwoNamedTypesAndDissolvesAtCM5() {
        List<String> reaches =
                newWorldFiles()
                        .flatMap(NewWorldBoundaryTest::offendingLines)
                        .filter(line -> THE_CONTENT_HALF_TW1_LEFT_STANDING.matcher(line).find())
                        .toList();

        assertThat(reaches)
                .as(
                        "TW-1 moved the trip half and left the content half standing, so two trip"
                                + " files still name it: the fork's published-visibility check and"
                                + " the profile showcase response. Both are types the CONTENT half"
                                + " owns and has its own callers for, which the trip module merely"
                                + " reads as a second consumer — CM-5 moves them onto the itinerary"
                                + " object. This is NOT a migration window and NOT a leftover: it is"
                                + " the shape of the tree until CM-5 deletes the old package."
                                + " Counted, so a third is a red build")
                .hasSize(2);
    }

    @Test
    void theScanReachesRealFiles() {
        assertThat(newWorldFiles().count()).isGreaterThan(3);
    }

    @Test
    void theRuleWouldFireOnABadImport() {
        assertThat(OLD_WORLD.matcher(anImportOf("itinerary", "Trip")).find()).isTrue();
        assertThat(OLD_WORLD.matcher(anImportOf("invitation", "InvitationService")).find()).isTrue();
        assertThat(OLD_WORLD.matcher(anImportOf("common.authz", "Membership")).find()).isFalse();
        assertThat(OLD_WORLD.matcher(anImportOf("media", "PhotoService")).find()).isFalse();
        assertThat(OLD_WORLD.matcher(anImportOf("identity", "Traveler")).find()).isFalse();
        assertThat(OLD_WORLD.matcher(anImportOf("diary", "DiaryService")).find()).isFalse();
    }

    @Test
    void theRetiredPackagesAreNoLongerNamedBecauseTheyNoLongerExist() {
        assertThat(OLD_WORLD.matcher(anImportOf("workspace", "WorkspaceService")).find())
                .as("workspace moved into the trip module at ticket 04, so naming it here would"
                        + " forbid an import nothing can write")
                .isFalse();
        assertThat(OLD_WORLD.matcher(anImportOf("membership", "MembershipService")).find())
                .as("and membership moved at ticket 07")
                .isFalse();
        assertThat(Path.of("src/main/java/com/largata/workspace")).doesNotExist();
        assertThat(Path.of("src/main/java/com/largata/membership")).doesNotExist();
    }

    private static String anImportOf(String pkg, String type) {
        return "import com.largata." + pkg + "." + type + ";";
    }

    private static Stream<Path> newWorldFiles() {
        return NEW_WORLD.stream()
                .map(module -> Path.of("src/main/java/com/largata", module))
                .filter(Files::isDirectory)
                .flatMap(NewWorldBoundaryTest::javaFilesUnder);
    }

    private static Stream<Path> javaFilesUnder(Path root) {
        try {
            return Files.walk(root)
                    .filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().endsWith(".java"));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static Stream<String> offendingLines(Path file) {
        try {
            List<String> lines = Files.readAllLines(file);
            return lines.stream()
                    .filter(line -> OLD_WORLD.matcher(line).find())
                    .map(line -> file + ": " + line.strip());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
