package com.largata.place;

import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;


class PlaceModuleBoundaryTest {

    private static final String PLACE = "com.largata.place";

    private final JavaClasses largata =
            new ClassFileImporter()
                    .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                    .importPackages("com.largata");

    @Test
    void nothingOutsideThePlaceModuleReachesItsInternals() {
        noClasses()
                .that()
                .resideOutsideOfPackage(PLACE + "..")
                .should()
                .dependOnClassesThat()
                .resideInAPackage(PLACE)
                .as("a module is reached by ID and service interface only (ADR-002) — never its internals")
                .check(largata);
    }


    @Test
    void thePlaceModulesWebLayerIsItsOwnAndNobodyElsesToCall() {
        noClasses()
                .that()
                .resideOutsideOfPackage(PLACE + "..")
                .should()
                .dependOnClassesThat()
                .resideInAPackage(PLACE + ".web..")
                .as("a controller is an edge, never a collaborator")
                .check(largata);
    }


    @Test
    void thePlaceModuleDependsOnNoOtherFeatureModule() {
        noClasses()
                .that()
                .resideInAPackage(PLACE + "..")
                .should()
                .dependOnClassesThat()
                .resideInAnyPackage(
                        "com.largata.itinerary..",
                        "com.largata.invitation..",
                        "com.largata.chat..",
                        "com.largata.poll..",
                        "com.largata.media..",
                        "com.largata.report..",
                        "com.largata.workspace..")
                .as("place answers a question about the world; it knows nothing about trips")
                .check(largata);
    }


    @Test
    void theModulesOwnApiPackageDependsOnNothingInsideIt() {
        noClasses()
                .that()
                .resideInAPackage(PLACE + ".api..")
                .should()
                .dependOnClassesThat()
                .resideInAPackage(PLACE)
                .as("the published contract cannot depend on the implementation behind it")
                .check(largata);
    }


    @Test
    void theBoundaryTestSeesTheModuleItGuards() {
        assertThat(largata.that(resideInAPackage(PLACE + "..")))
                .as("guards against a vacuously passing rule — the import must have found the module")
                .hasSizeGreaterThan(5);
    }
}
