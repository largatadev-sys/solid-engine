package com.largata.discovery;

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


class DiscoveryModuleBoundaryTest {

    private static final String DISCOVERY = "com.largata.discovery";

    private static final DescribedPredicate<JavaClass> ANYTHING_IN_THE_MODULE =
            resideInAPackage(DISCOVERY + "..");

    private static final DescribedPredicate<JavaClass> ANOTHER_MODULE =
            resideInAPackage("com.largata..")
                    .and(not(resideInAPackage(DISCOVERY + "..")))
                    .and(not(resideInAPackage("com.largata.common..")))
                    .and(not(resideInAPackage("com.largata.identity..")))
                    .and(not(resideInAPackage("com.largata.itinerary.api..")))
                    .and(not(resideInAPackage("com.largata.trip.api..")));

    private final JavaClasses largata =
            new ClassFileImporter()
                    .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                    .importPackages("com.largata");

    @Test
    void nothingOutsideTheDiscoveryModuleReachesIntoIt() {
        noClasses()
                .that()
                .resideOutsideOfPackage(DISCOVERY + "..")
                .should()
                .dependOnClassesThat(ANYTHING_IN_THE_MODULE)
                .as("a module is reached by ID and service interface only (ADR-002) — an ALLOWLIST, so"
                        + " the implementation, the web edge and any subpackage added later are all"
                        + " covered without anyone remembering to name them. Discovery has no"
                        + " in-process caller, so under ADR-038 rule 1 as amended on 11/09/2026 it has"
                        + " no api package — and it publishes no refusal either, so it has no front"
                        + " door at all and NOTHING outside it may name any part of it")
                .check(largata);
    }


    @Test
    void theDiscoveryModuleComposesApisAndOwnsNoTable() {
        noClasses()
                .that()
                .resideInAPackage(DISCOVERY + "..")
                .should()
                .dependOnClassesThat(ANOTHER_MODULE)
                .as("discovery is a COMPOSITION module: it owns no table and no query of its own, and"
                        + " reads publication.api and trip.api beside the two every module shares."
                        + " An allowlist, so a module invented tomorrow is forbidden the day it is"
                        + " created — and note it may name only the API packages, never the modules")
                .check(largata);
    }


    @Test
    void theDiscoveryModuleOwnsNoTableAndNoQueryOfItsOwn() {
        assertThat(
                        largata.that(resideInAPackage(DISCOVERY + "..")).stream()
                                .filter(
                                        type ->
                                                type.isAnnotatedWith("jakarta.persistence.Entity")
                                                        || type.getSimpleName().endsWith("Repository"))
                                .toList())
                .as("a composition module reads other modules' apis and owns nothing persistent -"
                        + " the moment it grows an entity or a repository it has stopped composing"
                        + " and started owning, which is the smell this rule exists to catch")
                .isEmpty();
    }


    @Test
    void theBoundaryTestSeesTheModuleItGuards() {
        assertThat(largata.that(resideInAPackage(DISCOVERY + "..")))
                .as("guards against a vacuously passing rule — the import must have found the module")
                .hasSizeGreaterThan(5);
    }


    @Test
    void theAllowlistPredicatesActuallySelectSomething() {
        assertThat(largata.that(ANYTHING_IN_THE_MODULE))
                .as("a predicate matching nothing would pass every rule above while guarding nothing")
                .isNotEmpty();
        assertThat(largata.that(ANOTHER_MODULE))
                .as("…and so would this one")
                .isNotEmpty();
    }
}
