package com.largata.trip;

import static com.tngtech.archunit.base.DescribedPredicate.not;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAnyPackage;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;


class TripModuleBoundaryTest {

    private static final String TRIP = "com.largata.trip";

    private static final String PUBLISHED_CONTRACT = TRIP + ".api..";

    private static final String[] FRONT_DOOR = {PUBLISHED_CONTRACT, TRIP + ".exception.."};

    private static final List<String> THE_SLICES =
            List.of(
                    "record", "plan", "editing", "history", "cover", "dump", "fork", "workspace",
                    "ownership", "validation", "destruction");

    private static final DescribedPredicate<JavaClass> THE_LEGACY_EXEMPTION =
            resideInAPackage("com.largata.itinerary..");

    private static final DescribedPredicate<JavaClass> BEHIND_THE_MODULES_FRONT_DOOR =
            resideInAPackage(TRIP + "..").and(not(resideInAnyPackage(FRONT_DOOR)));

    private final JavaClasses largata =
            new ClassFileImporter()
                    .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                    .importPackages("com.largata");

    @Test
    void theOnlyWayIntoTheTripModuleIsItsApiAndItsRefusals() {
        noClasses()
                .that()
                .resideOutsideOfPackage(TRIP + "..")
                .and(not(THE_LEGACY_EXEMPTION))
                .should()
                .dependOnClassesThat(BEHIND_THE_MODULES_FRONT_DOOR)
                .as("the facts records and the three interfaces ARE the published contract and live"
                        + " in api; the slices stay inside. An ALLOWLIST, so a slice added tomorrow"
                        + " is sealed the day it is created")
                .check(largata);
    }

    @Test
    void theModulesOwnApiPackageDependsOnNothingBehindIt() {
        noClasses()
                .that()
                .resideInAPackage(PUBLISHED_CONTRACT)
                .should()
                .dependOnClassesThat(BEHIND_THE_MODULES_FRONT_DOOR)
                .as("the published records and interfaces cannot reach back into the slices")
                .check(largata);
    }

    @Test
    void theBoundaryTestSeesTheModuleItGuards() {
        assertThat(largata.that(resideInAPackage(TRIP + "..")))
                .as("guards against a vacuously passing rule - the import must have found the module")
                .hasSizeGreaterThan(100);
    }

    @Test
    void theAllowlistPredicatesActuallySelectSomething() {
        assertThat(largata.that(BEHIND_THE_MODULES_FRONT_DOOR))
                .as("a predicate matching nothing would pass every rule above while guarding nothing")
                .isNotEmpty();
        assertThat(largata.that(resideInAnyPackage(FRONT_DOOR)))
                .as("and a front door matching nothing would make the rules unfalsifiable")
                .isNotEmpty();
    }

    @Test
    void everySliceNamedHereIsARealPackageHoldingRealCode() {
        for (String slice : THE_SLICES) {
            assertThat(largata.that(resideInAPackage(TRIP + "." + slice + "..")))
                    .as("the slice list is the module's map; a name that has stopped matching a"
                            + " package would leave a slice unlisted and nobody would notice", slice)
                    .isNotEmpty();
        }
    }

    @Test
    void theLegacyExemptionSelectsTheWholeOldPackageAndDissolvesAtCM5() {
        assertThat(largata.that(THE_LEGACY_EXEMPTION))
                .as("the old package's content half reaches into the trip half today and is DELETED"
                        + " at CM-5 rather than rewritten - an exemption selecting a handful of"
                        + " classes would mean the predicate had stopped naming what it describes")
                .hasSizeGreaterThan(30);
    }

    @Test
    void noMigrationWindowSurvivesInEitherGuard() {
        List<String> windows =
                Stream.of(
                                Path.of("src/test/java/com/largata/trip/TripModuleBoundaryTest.java"),
                                Path.of("src/test/java/com/largata/support/NewWorldBoundaryTest.java"))
                        .flatMap(TripModuleBoundaryTest::windowLines)
                        .toList();

        assertThat(windows)
                .as("the two branch-local windows let the move happen in pieces and were DELETED"
                        + " with the last one at ticket 07. Reintroducing one is a red build, not a"
                        + " quiet convenience - which is the whole of what branch-local means")
                .isEmpty();
    }

    private static final Pattern A_WINDOW = Pattern.compile("MIGRATION_WINDOW|SLICES_IN_FLIGHT");

    private static Stream<String> windowLines(Path guard) {
        if (!Files.isRegularFile(guard)) {
            throw new IllegalStateException("the guard this test polices is missing: " + guard);
        }
        try {
            return Files.readAllLines(guard).stream()
                    .filter(line -> A_WINDOW.matcher(line).find())
                    .filter(line -> !line.contains("A_WINDOW = Pattern.compile"))
                    .map(line -> guard + ": " + line.strip());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
