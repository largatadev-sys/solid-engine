package com.largata.mytrips;

import static com.tngtech.archunit.base.DescribedPredicate.not;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;


class MyTripsModuleBoundaryTest {

    private static final String MYTRIPS = "com.largata.mytrips";

    private static final DescribedPredicate<JavaClass> BEHIND_THE_MODULES_FRONT_DOOR =
            resideInAPackage(MYTRIPS + "..");

    private static final DescribedPredicate<JavaClass> ANOTHER_MODULE =
            resideInAPackage("com.largata..")
                    .and(not(resideInAPackage(MYTRIPS + "..")))
                    .and(not(resideInAPackage("com.largata.common..")))
                    .and(not(resideInAPackage("com.largata.identity..")))
                    .and(not(resideInAPackage("com.largata.itinerary.api..")))
                    .and(not(resideInAPackage("com.largata.trip.api..")))
                    .and(not(resideInAPackage("com.largata.trip.room..")));

    private final JavaClasses largata =
            new ClassFileImporter()
                    .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                    .importPackages("com.largata");

    @Test
    void nothingReachesIntoTheMyTripsModule() {
        noClasses()
                .that()
                .resideOutsideOfPackage(MYTRIPS + "..")
                .should()
                .dependOnClassesThat(BEHIND_THE_MODULES_FRONT_DOOR)
                .as("a module is reached by ID and service interface only (ADR-002) - an ALLOWLIST,"
                        + " so the implementation, the web edge and any subpackage added later are"
                        + " all covered without anyone remembering to name them. mytrips has no"
                        + " in-process caller, so under ADR-038 rule 1 as amended on 11/09/2026 it"
                        + " has no api package at all and nothing may name it")
                .check(largata);
    }


    @Test
    void theMyTripsModuleComposesApisAndOwnsNoTable() {
        noClasses()
                .that()
                .resideInAPackage(MYTRIPS + "..")
                .should()
                .dependOnClassesThat(ANOTHER_MODULE)
                .as("mytrips is a READ-SURFACE module: it owns the Trips tab's wire contract, owns"
                        + " no table and no query of its own, and reads trip.api for the page and"
                        + " its facets and itinerary.api for the live publication — which it read"
                        + " from a port in the shared kernel until TW-2, where the kernel's authz"
                        + " package dissolved and the reads nobody but a reader needed went to the"
                        + " module that owns publication."
                        + " An allowlist naming only API packages, never the modules")
                .check(largata);
    }


    @Test
    void theMyTripsModuleOwnsNoTableAndNoQueryOfItsOwn() {
        assertThat(
                        largata.that(resideInAPackage(MYTRIPS + "..")).stream()
                                .filter(
                                        type ->
                                                type.isAnnotatedWith("jakarta.persistence.Entity")
                                                        || type.getSimpleName().endsWith("Repository"))
                                .toList())
                .as("a read-surface module reads other modules' apis and owns nothing persistent -"
                        + " the moment it grows an entity or a repository it has stopped composing"
                        + " and started owning, which is the smell this rule exists to catch")
                .isEmpty();
    }


    @Test
    void theBoundaryTestSeesTheModuleItGuards() {
        assertThat(largata.that(resideInAPackage(MYTRIPS + "..")))
                .as("guards against a vacuously passing rule - the import must have found the module")
                .hasSizeGreaterThan(1);
    }


    @Test
    void theAllowlistPredicatesActuallySelectSomething() {
        assertThat(largata.that(BEHIND_THE_MODULES_FRONT_DOOR))
                .as("a predicate matching nothing would pass every rule above while guarding nothing")
                .isNotEmpty();
        assertThat(largata.that(ANOTHER_MODULE))
                .as("...and so would this one")
                .isNotEmpty();
    }
}
