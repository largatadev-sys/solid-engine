package com.largata.report;

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


class ReportModuleBoundaryTest {

    private static final String REPORT = "com.largata.report";

    private static final String PUBLISHED_CONTRACT = REPORT + ".api..";

    private static final DescribedPredicate<JavaClass> BEHIND_THE_MODULES_FRONT_DOOR =
            resideInAPackage(REPORT + "..").and(not(resideInAPackage(PUBLISHED_CONTRACT)));

    private static final DescribedPredicate<JavaClass> A_MODULE_IT_MAY_NOT_NAME =
            resideInAPackage("com.largata..")
                    .and(not(resideInAPackage(REPORT + "..")))
                    .and(not(resideInAPackage("com.largata.common..")))
                    .and(not(resideInAPackage("com.largata.identity..")))
                    .and(not(resideInAPackage("com.largata.media..")));

    private final JavaClasses largata =
            new ClassFileImporter()
                    .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                    .importPackages("com.largata");

    @Test
    void theOnlyWayIntoTheReportModuleIsItsApiPackage() {
        noClasses()
                .that()
                .resideOutsideOfPackage(REPORT + "..")
                .should()
                .dependOnClassesThat(BEHIND_THE_MODULES_FRONT_DOOR)
                .as("a module is reached by ID and service interface only (ADR-002) — an ALLOWLIST, so"
                        + " the implementation, the web edge and any subpackage added later are all"
                        + " covered without anyone remembering to name them")
                .check(largata);
    }


    @Test
    void theReportModuleReachesOnlyWhatItIsAllowedTo() {
        noClasses()
                .that()
                .resideInAPackage(REPORT + "..")
                .should()
                .dependOnClassesThat(A_MODULE_IT_MAY_NOT_NAME)
                .as("report carries a complaint and the evidence attached to it — stated as an ALLOWLIST (common, identity, media), so a module"
                        + " invented tomorrow is forbidden the day it is created")
                .check(largata);
    }


    @Test
    void theModulesOwnApiPackageDependsOnNothingBehindIt() {
        noClasses()
                .that()
                .resideInAPackage(PUBLISHED_CONTRACT)
                .should()
                .dependOnClassesThat(BEHIND_THE_MODULES_FRONT_DOOR)
                .as("the published contract cannot depend on the implementation behind it")
                .check(largata);
    }


    @Test
    void theBoundaryTestSeesTheModuleItGuards() {
        assertThat(largata.that(resideInAPackage(REPORT + "..")))
                .as("guards against a vacuously passing rule — the import must have found the module")
                .hasSizeGreaterThan(2);
    }


    @Test
    void theAllowlistPredicatesActuallySelectSomething() {
        assertThat(largata.that(BEHIND_THE_MODULES_FRONT_DOOR))
                .as("a predicate matching nothing would pass every rule above while guarding nothing")
                .isNotEmpty();
        assertThat(largata.that(A_MODULE_IT_MAY_NOT_NAME))
                .as("…and so would this one")
                .isNotEmpty();
    }
}
