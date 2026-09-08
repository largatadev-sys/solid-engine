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
import org.junit.jupiter.api.Test;


class TripModuleBoundaryTest {

    private static final String TRIP = "com.largata.trip";

    private static final String PUBLISHED_CONTRACT = TRIP + ".api..";

    private static final String[] FRONT_DOOR = {PUBLISHED_CONTRACT, TRIP + ".exception.."};

    private static final DescribedPredicate<JavaClass> THE_LEGACY_EXEMPTION =
            resideInAPackage("com.largata.itinerary..");

    private static final DescribedPredicate<JavaClass> THE_MIGRATION_WINDOW =
            resideInAnyPackage("com.largata.membership..");

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
                .and(not(THE_MIGRATION_WINDOW))
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
                .hasSizeGreaterThan(8);
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
    void theLegacyExemptionSelectsTheWholeOldPackageAndDissolvesAtCM5() {
        assertThat(largata.that(THE_LEGACY_EXEMPTION))
                .as("the old package's content half reaches into the trip half today and is DELETED"
                        + " at CM-5 rather than rewritten - an exemption selecting a handful of"
                        + " classes would mean the predicate had stopped naming what it describes")
                .hasSizeGreaterThan(30);
    }

    @Test
    void theMigrationWindowIsBranchLocalAndSelectsWhatItHoldsOpen() {
        assertThat(largata.that(THE_MIGRATION_WINDOW))
                .as("the one branch-local window: an unmoved satellite still depends on a moved trip"
                        + " internal. Ticket 07 moves it and DELETES this window; a window selecting"
                        + " nothing has already outlived its purpose")
                .isNotEmpty();
    }
}
