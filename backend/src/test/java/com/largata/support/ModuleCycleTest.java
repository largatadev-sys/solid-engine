package com.largata.support;

import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;
import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;


class ModuleCycleTest {

    private static final Path MODULES = Path.of("src/main/java/com/largata");

    private static final Map<String, String> KNOWN_CYCLES =
            Map.of(
                    "common <-> join", "SecurityConfig names JoinPaths - CM-5 ticket 12",
                    "common <-> report", "SecurityConfig names ReportPaths - CM-5 ticket 12",
                    "common <-> ws", "SecurityConfig names WebSocketPaths - CM-5 ticket 12",
                    "identity <-> media", "the avatar is a photo - CM-5 ticket 12",
                    "identity <-> ws", "FollowTopic fans out over the transport - CM-5 ticket 12");

    private final JavaClasses largata =
            new ClassFileImporter()
                    .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                    .importPackages("com.largata");

    @Test
    void noCycleExistsThatIsNotAlreadyRecorded() {
        assertThat(cyclesInTheTree())
                .as(
                        "a cycle is how a boundary stops meaning anything - each one recorded here"
                                + " carries the story that closes it, and a cycle NOT on this list is"
                                + " a new one, which is what this test exists to refuse")
                .containsExactlyInAnyOrderElementsOf(KNOWN_CYCLES.keySet());
    }

    @Test
    void everyRecordedCycleNamesTheStoryThatClosesIt() {
        for (Map.Entry<String, String> known : KNOWN_CYCLES.entrySet()) {
            assertThat(known.getValue())
                    .as("%s is tolerated today, so it carries its reason and its trigger", known.getKey())
                    .isNotBlank()
                    .contains("CM-5");
        }
    }

    @Test
    void theRecordedListCanOnlyEverShrink() {
        assertThat(cyclesInTheTree())
                .as(
                        "a cycle leaves this list by being removed from the tree, never by being"
                                + " re-described - so the measured set may not exceed the recorded one")
                .hasSizeLessThanOrEqualTo(KNOWN_CYCLES.size());
    }

    @Test
    void theModulesThatDependOnNothingElseStayThatWay() {
        slices()
                .matching("com.largata.(place)..")
                .should()
                .beFreeOfCycles()
                .as("place answers a question about the world and is in no cycle with anything")
                .check(largata);
    }

    @Test
    void theScanReachesRealFilesRatherThanPassingVacuously() {
        assertThat(modulesInTheTree())
                .as("a scan that found no modules would report no cycles and prove nothing")
                .hasSizeGreaterThan(15);
        assertThat(edges().values().stream().mapToInt(Set::size).sum())
                .as("...and so would one that found modules but read none of their imports")
                .isGreaterThan(30);
    }

    private static Set<String> cyclesInTheTree() {
        Map<String, Set<String>> edges = edges();
        Set<String> found = new TreeSet<>();
        for (String a : edges.keySet()) {
            for (String b : edges.get(a)) {
                if (edges.getOrDefault(b, Set.of()).contains(a)) {
                    found.add(a.compareTo(b) < 0 ? a + " <-> " + b : b + " <-> " + a);
                }
            }
        }
        return found;
    }

    private static Map<String, Set<String>> edges() {
        List<String> modules = modulesInTheTree();
        Map<String, Set<String>> edges = new TreeMap<>();
        for (String module : modules) {
            Set<String> reached = new TreeSet<>();
            try (Stream<Path> found = Files.walk(MODULES.resolve(module))) {
                found.filter(Files::isRegularFile)
                        .filter(p -> p.getFileName().toString().endsWith(".java"))
                        .forEach(p -> read(p).lines().forEach(line -> {
                            String named = moduleNamedByAnImport(line);
                            if (named != null && !named.equals(module) && modules.contains(named)) {
                                reached.add(named);
                            }
                        }));
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
            edges.put(module, reached);
        }
        return edges;
    }

    private static String moduleNamedByAnImport(String line) {
        String prefix = line.startsWith("import static ") ? "import static com.largata." : "import com.largata.";
        if (!line.startsWith(prefix)) {
            return null;
        }
        String rest = line.substring(prefix.length());
        int dot = rest.indexOf('.');
        return dot < 0 ? null : rest.substring(0, dot);
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

    private static String read(Path file) {
        try {
            return Files.readString(file);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
