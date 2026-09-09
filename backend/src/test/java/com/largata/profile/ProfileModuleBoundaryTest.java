package com.largata.profile;

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


class ProfileModuleBoundaryTest {

    private static final String PROFILE = "com.largata.profile";

    private static final String PUBLISHED_CONTRACT = PROFILE + ".api..";

    private static final DescribedPredicate<JavaClass> BEHIND_THE_MODULES_FRONT_DOOR =
            resideInAPackage(PROFILE + "..").and(not(resideInAPackage(PUBLISHED_CONTRACT)));

    private static final DescribedPredicate<JavaClass> ANOTHER_MODULE =
            resideInAPackage("com.largata..")
                    .and(not(resideInAPackage(PROFILE + "..")))
                    .and(not(resideInAPackage("com.largata.common..")))
                    .and(not(resideInAPackage("com.largata.identity..")))
                    .and(not(resideInAPackage("com.largata.itinerary.api..")))
                    .and(not(resideInAPackage("com.largata.postcard.api..")))
                    .and(not(resideInAPackage("com.largata.trip.api..")));

    private final JavaClasses largata =
            new ClassFileImporter()
                    .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                    .importPackages("com.largata");

    @Test
    void theOnlyWayIntoTheProfileModuleIsItsApiPackage() {
        noClasses()
                .that()
                .resideOutsideOfPackage(PROFILE + "..")
                .should()
                .dependOnClassesThat(BEHIND_THE_MODULES_FRONT_DOOR)
                .as("a module is reached by ID and service interface only (ADR-002) — an ALLOWLIST, so"
                        + " the implementation, the web edge and any subpackage added later are all"
                        + " covered without anyone remembering to name them")
                .check(largata);
    }


    @Test
    void theProfileModuleComposesApisAndOwnsNoTable() {
        noClasses()
                .that()
                .resideInAPackage(PROFILE + "..")
                .should()
                .dependOnClassesThat(ANOTHER_MODULE)
                .as("profile is a COMPOSITION module: it owns no table and no query of its own, and"
                        + " reads identity for the header and the follow lists, publication.api for"
                        + " the counts and the showcase, postcard.api for the diary sections, and"
                        + " trip.api for the teasers and the archived set")
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
    void theProfileModuleOwnsNoTableAndNoQueryOfItsOwn() {
        assertThat(
                        largata.that(resideInAPackage(PROFILE + "..")).stream()
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
        assertThat(largata.that(resideInAPackage(PROFILE + "..")))
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
