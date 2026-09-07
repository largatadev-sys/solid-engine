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


class OldEntryTableIsReadOnlyTest {

    private static final Path MAIN = Path.of("src/main/java/com/largata");

    private static final Pattern WRITES_THE_ENTITY =
            Pattern.compile("\\bDiaryEntry(Repository)?\\b[^;]*\\.(save|saveAndFlush|delete)\\b");

    private static final Pattern NAMES_THE_ENTITY_TYPE = Pattern.compile("\\bDiaryEntry\\b");

    @Test
    void noServiceStillWritesThroughTheOldEntryRepository() {
        List<String> offenders =
                javaFilesUnder(MAIN)
                        .flatMap(file -> linesMatching(file, WRITES_THE_ENTITY))
                        .toList();

        assertThat(offenders)
                .as(
                        "CM-2 ticket 06 made the old entry endpoints adapters over the postcard tables:"
                                + " every write now goes through LegacyEntries, and the diary_entry table"
                                + " is source material for the backfill and nothing else. A write here"
                                + " would fork the content world in two, which is the exact failure the"
                                + " strangler exists to avoid")
                .isEmpty();
    }


    @Test
    void onlyTheEntityAndItsRepositorySurviveAsBackfillSourceMaterial() {
        List<String> naming =
                javaFilesUnder(MAIN)
                        .filter(file -> linesMatching(file, NAMES_THE_ENTITY_TYPE).findAny().isPresent())
                        .map(file -> file.getFileName().toString())
                        .sorted()
                        .toList();

        assertThat(naming)
                .as(
                        "the entity, its repository and its photo audience are all that may still name"
                                + " the old row; anything else means a reader or a writer was missed")
                .containsExactly(
                        "DiaryEntry.java", "DiaryEntryPhotoAudience.java", "DiaryEntryRepository.java");
    }


    @Test
    void theScanWouldFireOnARealWrite() {
        assertThat(WRITES_THE_ENTITY.matcher("DiaryEntry saved = entries.saveAndFlush(entry);").find())
                .isTrue();
        assertThat(WRITES_THE_ENTITY.matcher("private final DiaryEntryRepository entries;").find())
                .isFalse();
        assertThat(WRITES_THE_ENTITY.matcher("entries.save(rewritten);").find())
                .as("an unrelated field named entries must not trip this scan")
                .isFalse();
        assertThat(WRITES_THE_ENTITY.matcher("postcards.saveAndFlush(postcard);").find()).isFalse();
    }


    private static Stream<String> linesMatching(Path file, Pattern pattern) {
        try {
            return Files.readAllLines(file).stream()
                    .filter(line -> pattern.matcher(line).find())
                    .map(line -> file + ": " + line.strip())
                    .toList()
                    .stream();
        } catch (IOException unreadable) {
            throw new UncheckedIOException(unreadable);
        }
    }


    private static Stream<Path> javaFilesUnder(Path root) {
        try {
            return Files.walk(root)
                    .filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().endsWith(".java"))
                    .toList()
                    .stream();
        } catch (IOException unreadable) {
            throw new UncheckedIOException(unreadable);
        }
    }
}
