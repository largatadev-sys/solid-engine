package com.largata.join;

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
import java.util.List;
import org.junit.jupiter.api.Test;


class JoinModuleBoundaryTest {

    private static final String JOIN = "com.largata.join";

    private static final String PUBLISHED_CONTRACT = JOIN + ".api..";

    private static final String[] FRONT_DOOR = {PUBLISHED_CONTRACT, JOIN + ".exception.."};

    private static final List<String> THE_SLICES = List.of("join", "card");

    private static final DescribedPredicate<JavaClass> BEHIND_THE_MODULES_FRONT_DOOR =
            resideInAPackage(JOIN + "..").and(not(resideInAnyPackage(FRONT_DOOR)));

    private static final DescribedPredicate<JavaClass> A_MODULE_IT_MAY_NOT_NAME =
            resideInAPackage("com.largata..")
                    .and(not(resideInAPackage(JOIN + "..")))
                    .and(not(resideInAPackage("com.largata.common..")))
                    .and(not(resideInAPackage("com.largata.identity..")))
                    .and(not(resideInAPackage("com.largata.invitation..")))
                    .and(not(resideInAPackage("com.largata.media..")))
                    .and(not(resideInAPackage("com.largata.trip..")))
                    .and(not(resideInAPackage("com.largata.ws..")));

    private final JavaClasses largata =
            new ClassFileImporter()
                    .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                    .importPackages("com.largata");

    @Test
    void theOnlyWayIntoTheJoinModuleIsItsApiAndItsRefusals() {
        noClasses()
                .that()
                .resideOutsideOfPackage(JOIN + "..")
                .should()
                .dependOnClassesThat(BEHIND_THE_MODULES_FRONT_DOOR)
                .as("a module is reached by ID and service interface only (ADR-002) — an ALLOWLIST, so"
                        + " the implementation, the web edge and any subpackage added later are all"
                        + " covered without anyone remembering to name them. The two slices stay"
                        + " inside; api holds only the route constant SecurityConfig reads, until"
                        + " ticket 13 retires it")
                .check(largata);
    }


    @Test
    void theJoinModuleReachesOnlyWhatItIsAllowedTo() {
        noClasses()
                .that()
                .resideInAPackage(JOIN + "..")
                .should()
                .dependOnClassesThat(A_MODULE_IT_MAY_NOT_NAME)
                .as("join asks for a seat, supersedes any open invitation and announces the arrival — stated as an ALLOWLIST (common, identity, invitation, media, trip, ws), so a module"
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
    void everySliceNamedHereIsARealPackageHoldingRealCode() {
        for (String slice : THE_SLICES) {
            assertThat(largata.that(resideInAPackage(JOIN + "." + slice + "..")))
                    .as("the slice list is the module's map; a name that has stopped matching a"
                            + " package would leave a slice unlisted and nobody would notice", slice)
                    .isNotEmpty();
        }
    }


    @Test
    void theBoundaryTestSeesTheModuleItGuards() {
        assertThat(largata.that(resideInAPackage(JOIN + "..")))
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
        assertThat(largata.that(resideInAnyPackage(FRONT_DOOR)))
                .as("and a front door matching nothing would make the rules unfalsifiable")
                .isNotEmpty();
    }
}
