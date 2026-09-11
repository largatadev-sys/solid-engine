package com.largata.chat;

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


class ChatModuleBoundaryTest {

    private static final String CHAT = "com.largata.chat";

    private static final String PUBLISHED_REFUSALS = CHAT + ".exception..";

    private static final DescribedPredicate<JavaClass> BEHIND_THE_MODULES_FRONT_DOOR =
            resideInAPackage(CHAT + "..").and(not(resideInAPackage(PUBLISHED_REFUSALS)));

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
    void theOnlyWayIntoTheChatModuleIsItsRefusals() {
        noClasses()
                .that()
                .resideOutsideOfPackage(CHAT + "..")
                .should()
                .dependOnClassesThat(BEHIND_THE_MODULES_FRONT_DOOR)
                .as("a module is reached by ID and service interface only (ADR-002) — an ALLOWLIST, so"
                        + " the implementation, the web edge and any subpackage added later are all"
                        + " covered without anyone remembering to name them. Chat has no in-process"
                        + " caller, so under ADR-038 rule 1 as amended on 11/09/2026 it has no api"
                        + " package at all and its refusals are the whole front door")
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
        assertThat(largata.that(resideInAPackage(PUBLISHED_REFUSALS)))
                .as("and a front door matching nothing would make the rules unfalsifiable")
                .isNotEmpty();
    }
}
