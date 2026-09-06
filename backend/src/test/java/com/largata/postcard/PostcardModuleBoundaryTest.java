package com.largata.postcard;

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


class PostcardModuleBoundaryTest {

    private static final String POSTCARD = "com.largata.postcard";

    private static final String PUBLISHED_CONTRACT = POSTCARD + ".api..";

    private static final String[] FRONT_DOOR = {PUBLISHED_CONTRACT, POSTCARD + ".exception.."};

    private static final DescribedPredicate<JavaClass> BEHIND_THE_MODULES_FRONT_DOOR =
            resideInAPackage(POSTCARD + "..").and(not(resideInAnyPackage(FRONT_DOOR)));

    private final JavaClasses largata =
            new ClassFileImporter()
                    .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                    .importPackages("com.largata");

    @Test
    void theOnlyWayIntoThePostcardModuleIsItsApiAndItsRefusals() {
        noClasses()
                .that()
                .resideOutsideOfPackage(POSTCARD + "..")
                .should()
                .dependOnClassesThat(BEHIND_THE_MODULES_FRONT_DOOR)
                .as("the layer split cost Postcard its package-private seal - its factories and"
                        + " mutators are public now, so this rule is what keeps the entity, the"
                        + " repository, the service and the wire records inside the module. An"
                        + " ALLOWLIST, so a layer added tomorrow is sealed the day it is created")
                .check(largata);
    }

    @Test
    void theModulesOwnApiPackageDependsOnNothingBehindIt() {
        noClasses()
                .that()
                .resideInAPackage(PUBLISHED_CONTRACT)
                .should()
                .dependOnClassesThat(BEHIND_THE_MODULES_FRONT_DOOR)
                .as("the published contract cannot hand out the entity it is there to hide")
                .check(largata);
    }

    @Test
    void theBoundaryTestSeesTheModuleItGuards() {
        assertThat(largata.that(resideInAPackage(POSTCARD + "..")))
                .as("guards against a vacuously passing rule - the import must have found the module")
                .hasSizeGreaterThan(20);
    }

    @Test
    void theAllowlistPredicateActuallySelectsSomething() {
        assertThat(largata.that(BEHIND_THE_MODULES_FRONT_DOOR))
                .as("a predicate matching nothing would pass every rule above while guarding nothing")
                .isNotEmpty();
        assertThat(largata.that(resideInAnyPackage(FRONT_DOOR)))
                .as("and a front door matching nothing would make the rules unfalsifiable")
                .isNotEmpty();
    }
}
