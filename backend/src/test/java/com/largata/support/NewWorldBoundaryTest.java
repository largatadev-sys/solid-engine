package com.largata.support;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.function.Predicate;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;


class NewWorldBoundaryTest {

    private static final List<String> NEW_WORLD = List.of("trip", "diary", "postcard", "publication");

    private static final Pattern OLD_WORLD =
            Pattern.compile(
                    "com\\.largata\\.(itinerary|workspace|membership|invitation|join|chat|poll|ws"
                            + "|verification|report|health)\\.");

    @Test
    void newWorldSourcesNeverNameAnOldWorldPackage() {
        List<String> offenders =
                newWorldFiles()
                        .filter(file -> !THE_MIGRATION_WINDOW.test(file))
                        .flatMap(NewWorldBoundaryTest::offendingLines)
                        .toList();

        assertThat(offenders)
                .as(
                        "the CM-1 modules may reach common, identity, media and each other — never a"
                                + " frozen old-world package; the rewire story deletes the old world"
                                + " and this guard with it")
                .isEmpty();
    }

    @Test
    void theMigrationWindowIsBranchLocalAndSelectsTheSlicesStillInFlight() {
        assertThat(newWorldFiles().filter(THE_MIGRATION_WINDOW).findAny())
                .as("the one branch-local window: a MOVED trip file may still name an UNMOVED"
                        + " old-world class while the relocation is in pieces. Ticket 07 finishes"
                        + " the move and DELETES this window; a window selecting no file has"
                        + " already outlived its purpose and must go")
                .isPresent();
    }


    @Test
    void theScanReachesRealFiles() {
        assertThat(newWorldFiles().count()).isGreaterThan(3);
    }

    @Test
    void theRuleWouldFireOnABadImport() {
        assertThat(OLD_WORLD.matcher("import com.largata.itinerary.Itinerary;").find()).isTrue();
        assertThat(OLD_WORLD.matcher("import com.largata.workspace.WorkspaceService;").find()).isTrue();
        assertThat(OLD_WORLD.matcher("import com.largata.common.authz.Membership;").find()).isFalse();
        assertThat(OLD_WORLD.matcher("import com.largata.media.PhotoService;").find()).isFalse();
        assertThat(OLD_WORLD.matcher("import com.largata.identity.Traveler;").find()).isFalse();
        assertThat(OLD_WORLD.matcher("import com.largata.diary.DiaryService;").find()).isFalse();
    }

    private static final List<String> SLICES_IN_FLIGHT =
            List.of("workspace", "record", "cover", "dump", "fork", "validation");


    private static final Predicate<Path> THE_MIGRATION_WINDOW =
            file -> {
                Path parent = file.getParent();
                if (parent == null) {
                    return false;
                }
                return SLICES_IN_FLIGHT.stream()
                        .anyMatch(slice -> parent.endsWith(Path.of("trip", slice)));
            };


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
