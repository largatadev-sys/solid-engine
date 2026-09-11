package com.largata.health;

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


class HealthModuleBoundaryTest {

    private static final String HEALTH = "com.largata.health";

    private static final DescribedPredicate<JavaClass> ANYTHING_IN_THE_MODULE =
            resideInAPackage(HEALTH + "..");

    private static final DescribedPredicate<JavaClass> A_MODULE_IT_MAY_NOT_NAME =
            resideInAPackage("com.largata..")
                    .and(not(resideInAPackage(HEALTH + "..")))
                    .and(not(resideInAPackage("com.largata.common..")))
                    .and(not(resideInAPackage("com.largata.identity..")));

    private final JavaClasses largata =
            new ClassFileImporter()
                    .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                    .importPackages("com.largata");

    @Test
    void nothingOutsideTheHealthModuleReachesIntoIt() {
        noClasses()
                .that()
                .resideOutsideOfPackage(HEALTH + "..")
                .should()
                .dependOnClassesThat(ANYTHING_IN_THE_MODULE)
                .as("a module is reached by ID and service interface only (ADR-002) — an ALLOWLIST, so"
                        + " the implementation, the web edge and any subpackage added later are all"
                        + " covered without anyone remembering to name them. Health has no in-process"
                        + " caller, so under ADR-038 rule 1 as amended on 11/09/2026 it has no api"
                        + " package — and it publishes no refusal either, so it has no front door at"
                        + " all and NOTHING outside it may name any part of it")
                .check(largata);
    }


    @Test
    void theHealthModuleReachesOnlyWhatItIsAllowedTo() {
        noClasses()
                .that()
                .resideInAPackage(HEALTH + "..")
                .should()
                .dependOnClassesThat(A_MODULE_IT_MAY_NOT_NAME)
                .as("health answers whether the server is alive and reaches nothing at all — stated as an ALLOWLIST (common, identity), so a module"
                        + " invented tomorrow is forbidden the day it is created")
                .check(largata);
    }


    @Test
    void theBoundaryTestSeesTheModuleItGuards() {
        assertThat(largata.that(resideInAPackage(HEALTH + "..")))
                .as("guards against a vacuously passing rule — the import must have found the module")
                .hasSizeGreaterThan(2);
    }


    @Test
    void theAllowlistPredicatesActuallySelectSomething() {
        assertThat(largata.that(ANYTHING_IN_THE_MODULE))
                .as("a predicate matching nothing would pass every rule above while guarding nothing")
                .isNotEmpty();
        assertThat(largata.that(A_MODULE_IT_MAY_NOT_NAME))
                .as("…and so would this one")
                .isNotEmpty();
    }
}
