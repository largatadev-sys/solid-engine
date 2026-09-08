package com.largata.chat;

import static com.tngtech.archunit.base.DescribedPredicate.not;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;


class ChatModuleBoundaryTest {

    private static final String CHAT = "com.largata.chat";

    private static final String PUBLISHED_CONTRACT = CHAT + ".api..";

    private static final DescribedPredicate<JavaClass> BEHIND_THE_MODULES_FRONT_DOOR =
            resideInAPackage(CHAT + "..").and(not(resideInAPackage(PUBLISHED_CONTRACT)));

    private static final DescribedPredicate<JavaClass> A_MODULE_IT_MAY_NOT_NAME =
            resideInAPackage("com.largata..")
                    .and(not(resideInAPackage(CHAT + "..")))
                    .and(not(resideInAPackage("com.largata.common..")))
                    .and(not(resideInAPackage("com.largata.identity..")))
                    .and(not(resideInAPackage("com.largata.ws..")));

    private final JavaClasses largata =
            new ClassFileImporter()
                    .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                    .importPackages("com.largata");

    @Test
    void theOnlyWayIntoTheChatModuleIsItsApiPackage() {
        noClasses()
                .that()
                .resideOutsideOfPackage(CHAT + "..")
                .should()
                .dependOnClassesThat(BEHIND_THE_MODULES_FRONT_DOOR)
                .as("a module is reached by ID and service interface only (ADR-002) — an ALLOWLIST, so"
                        + " the implementation, the web edge and any subpackage added later are all"
                        + " covered without anyone remembering to name them")
                .check(largata);
    }


    @Test
    void theChatModuleReachesOnlyWhatItIsAllowedTo() {
        noClasses()
                .that()
                .resideInAPackage(CHAT + "..")
                .should()
                .dependOnClassesThat(A_MODULE_IT_MAY_NOT_NAME)
                .as("chat carries a workspace conversation and fans it out over the transport — stated as an ALLOWLIST (common, identity, ws), so a module"
                        + " invented tomorrow is forbidden the day it is created")
                .check(largata);
    }


    @Test
    void theOnlyWayTheContractReachesBehindItIsTheOneBreachAlreadyRecorded() {
        assertThatThrownBy(
                        () ->
                                noClasses()
                                        .that()
                                        .resideInAPackage(PUBLISHED_CONTRACT)
                                        .should()
                                        .dependOnClassesThat(BEHIND_THE_MODULES_FRONT_DOOR)
                                        .check(largata))
                .as("ChatMessageResponse.of(ChatMessageView) maps from an internal type - a real ADR-039 breach,"
                        + " recorded rather than fixed, because reshaping this module's contract is"
                        + " not the scope of the PR that first guarded it. CM-5 ticket 12 closes it."
                        + " Asserting the breach STILL FAILS is what stops it being forgotten: the day"
                        + " someone fixes it this test goes red and the real rule replaces it")
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("ChatMessageResponse");
    }


    @Test
    void theBoundaryTestSeesTheModuleItGuards() {
        assertThat(largata.that(resideInAPackage(CHAT + "..")))
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
