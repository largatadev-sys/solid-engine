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
                    "com\\.largata\\.(itinerary|workspace|membership|invitation|join|chat|poll|ws"
                            + "|verification|report|health)\\.");

    @Test
    void newWorldSourcesNeverNameAnOldWorldPackage() {
        List<String> offenders =
                newWorldFiles()
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
