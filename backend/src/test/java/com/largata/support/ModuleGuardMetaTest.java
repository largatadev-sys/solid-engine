package com.largata.support;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;


class ModuleGuardMetaTest {

    private static final Path MODULES = Path.of("src/main/java/com/largata");

    private static final Path GUARDS = Path.of("src/test/java/com/largata");

    private static final List<String> UNDER_THE_RULE =
            List.of("diary", "place", "postcard", "publication", "trip");

    private static final Map<String, String> DELIBERATELY_OUTSIDE =
            Map.of(
                    "common", "shared kernel - every module may name it (ADR-038 classification)",
                    "identity", "shared kernel - every module may name it (ADR-038 classification)",
                    "media", "shared infrastructure - photos are reached by every content module",
                    "ws", "transport - it carries other modules' events and names their topics");

    private static final Map<String, String> OWED =
            Map.of(
                    "chat", "TW-1",
                    "poll", "TW-1",
                    "invitation", "TW-1",
                    "join", "TW-1",
                    "health", "TW-1",
                    "report", "TW-1",
                    "verification", "TW-1");

    private static final List<String> BEING_DISMANTLED =
            List.of("itinerary", "workspace", "membership");

    private static final Pattern A_BY_NAME_EXEMPTION =
            Pattern.compile("simpleName\\s*\\(|EXEMPTION|exempt", Pattern.CASE_INSENSITIVE);

    @Test
    void everyModuleUnderTheRuleHasAGuard() {
        for (String module : UNDER_THE_RULE) {
            assertThat(guardsOf(module))
                    .as(
                            "%s is under the api-only rule, so the build must assert its boundary"
                                    + " rather than a reader having to audit it",
                            module)
                    .isNotEmpty();
        }
    }

    @Test
    void noGuardAnywhereNamesAClassAsAnExemption() {
        List<String> offenders =
                allGuards()
                        .flatMap(ModuleGuardMetaTest::exemptingLines)
                        .toList();

        assertThat(offenders)
                .as(
                        "an exemption is how a breach stays green - it names the exact class being"
                                + " reached and calls the boundary held. CM-4 removed the last two;"
                                + " this is what stops the pattern eroding one convenience at a time")
                .isEmpty();
    }

    @Test
    void everyModuleIsClassifiedAndNoneHasDriftedQuietly() {
        List<String> classified =
                Stream.of(
                                UNDER_THE_RULE.stream(),
                                DELIBERATELY_OUTSIDE.keySet().stream(),
                                OWED.keySet().stream(),
                                BEING_DISMANTLED.stream())
                        .flatMap(s -> s)
                        .sorted()
                        .toList();

        assertThat(modulesInTheTree())
                .as(
                        "a module added from here is classified deliberately or fails on its first"
                                + " build - which is the whole of what forward-binding means")
                .containsExactlyInAnyOrderElementsOf(classified);
    }

    @Test
    void aModuleDeliberatelyOutsideTheRuleIsNotAskedForAGuard() {
        for (String module : DELIBERATELY_OUTSIDE.keySet()) {
            assertThat(DELIBERATELY_OUTSIDE.get(module))
                    .as("%s is outside the rule on purpose, so it carries its reason", module)
                    .isNotBlank();
        }
        assertThat(DELIBERATELY_OUTSIDE.keySet())
                .as("the shared kernel, the shared infrastructure and the transport - nothing else")
                .doesNotContainAnyElementsOf(UNDER_THE_RULE);
    }

    @Test
    void everyOwedModuleNamesTheStoryThatBringsItUnderTheRule() {
        for (Map.Entry<String, String> owed : OWED.entrySet()) {
            assertThat(owed.getValue())
                    .as(
                            "%s reaches into the old world today, so a guard written now would need"
                                    + " an immediate exemption - it is owed WITH a trigger, never"
                                    + " deferred silently",
                            owed.getKey())
                    .isNotBlank();
            assertThat(guardsOf(owed.getKey()))
                    .as(
                            "%s is on the owed list, so it has no guard yet - once it gains one it"
                                    + " moves to the guarded list and this fails until it does,"
                                    + " which is what makes the list shrink-only",
                            owed.getKey())
                    .isEmpty();
        }
        assertThat(OWED.keySet())
                .as("the owed list can only ever shrink - a module leaves it by gaining a guard")
                .doesNotContainAnyElementsOf(UNDER_THE_RULE);
    }

    @Test
    void theScanReachesRealFilesRatherThanPassingVacuously() {
        assertThat(modulesInTheTree()).hasSizeGreaterThan(15);
        assertThat(allGuards().count()).isGreaterThanOrEqualTo(UNDER_THE_RULE.size());
        assertThat(allGuards().map(ModuleGuardMetaTest::read).filter(t -> t.contains("noClasses")))
                .as("a guard file that never states a rule would satisfy the count and guard nothing")
                .hasSizeGreaterThanOrEqualTo(UNDER_THE_RULE.size());
    }

    @Test
    void theExemptionRuleWouldFireOnAReintroducedExemption() {
        assertThat(A_BY_NAME_EXEMPTION.matcher("resideInAPackage(TRIP).and(simpleName(\"X\"))").find())
                .isTrue();
        assertThat(A_BY_NAME_EXEMPTION.matcher("THE_ONE_NAMED_EXEMPTION").find()).isTrue();
        assertThat(A_BY_NAME_EXEMPTION.matcher("resideInAPackage(TRIP + \"..\")").find()).isFalse();
    }

    private static List<Path> guardsOf(String module) {
        Path dir = GUARDS.resolve(module);
        if (!Files.isDirectory(dir)) {
            return List.of();
        }
        try (Stream<Path> found = Files.list(dir)) {
            return found.filter(p -> p.getFileName().toString().endsWith("BoundaryTest.java"))
                    .toList();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static Stream<Path> allGuards() {
        return UNDER_THE_RULE.stream().flatMap(module -> guardsOf(module).stream());
    }

    private static List<String> modulesInTheTree() {
        try (Stream<Path> found = Files.list(MODULES)) {
            return found.filter(Files::isDirectory)
                    .map(p -> p.getFileName().toString())
                    .sorted()
                    .toList();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static Stream<String> exemptingLines(Path guard) {
        return read(guard)
                .lines()
                .filter(line -> A_BY_NAME_EXEMPTION.matcher(line).find())
                .map(line -> guard + ": " + line.strip());
    }

    private static String read(Path file) {
        try {
            return Files.readString(file);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
