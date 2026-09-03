package com.largata.place;

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


class PlaceModuleBoundaryTest {

    private static final String PLACE = "com.largata.place";

    private static final String PUBLISHED_CONTRACT = PLACE + ".api..";

    private static final DescribedPredicate<JavaClass> BEHIND_THE_MODULES_FRONT_DOOR =
            resideInAPackage(PLACE + "..").and(not(resideInAPackage(PUBLISHED_CONTRACT)));

    private static final DescribedPredicate<JavaClass> ANOTHER_MODULE =
            resideInAPackage("com.largata..")
                    .and(not(resideInAPackage(PLACE + "..")))
                    .and(not(resideInAPackage("com.largata.common..")))
                    .and(not(resideInAPackage("com.largata.identity..")));

    private final JavaClasses largata =
            new ClassFileImporter()
                    .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                    .importPackages("com.largata");

    @Test
    void theOnlyWayIntoThePlaceModuleIsItsApiPackage() {
        noClasses()
                .that()
                .resideOutsideOfPackage(PLACE + "..")
                .should()
                .dependOnClassesThat(BEHIND_THE_MODULES_FRONT_DOOR)
                .as("a module is reached by ID and service interface only (ADR-002) — an ALLOWLIST, so"
                        + " the implementation, the web edge and any subpackage added later are all"
                        + " covered without anyone remembering to name them")
                .check(largata);
    }


    @Test
    void thePlaceModuleReachesNoOtherFeatureModule() {
        noClasses()
                .that()
                .resideInAPackage(PLACE + "..")
                .should()
                .dependOnClassesThat(ANOTHER_MODULE)
                .as("place answers a question about the world and knows nothing about trips — stated as"
                        + " an allowlist (common and identity, the two every module shares), so a module"
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
        assertThat(largata.that(resideInAPackage(PLACE + "..")))
                .as("guards against a vacuously passing rule — the import must have found the module")
                .hasSizeGreaterThan(5);
    }


    @Test
    void theAllowlistPredicatesActuallySelectSomething() {
        assertThat(largata.that(BEHIND_THE_MODULES_FRONT_DOOR))
                .as("a predicate matching nothing would pass every rule above while guarding nothing")
                .isNotEmpty();
        assertThat(largata.that(ANOTHER_MODULE))
                .as("…and so would this one")
                .isNotEmpty();
    }
}
