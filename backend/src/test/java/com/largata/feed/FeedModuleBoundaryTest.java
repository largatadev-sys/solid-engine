package com.largata.feed;

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


class FeedModuleBoundaryTest {

    private static final String FEED = "com.largata.feed";

    private static final String PUBLISHED_REFUSALS = FEED + ".exception..";

    private static final DescribedPredicate<JavaClass> BEHIND_THE_MODULES_FRONT_DOOR =
            resideInAPackage(FEED + "..").and(not(resideInAPackage(PUBLISHED_REFUSALS)));

    private static final DescribedPredicate<JavaClass> ANOTHER_MODULE =
            resideInAPackage("com.largata..")
                    .and(not(resideInAPackage(FEED + "..")))
                    .and(not(resideInAPackage("com.largata.common..")))
                    .and(not(resideInAPackage("com.largata.identity..")))
                    .and(not(resideInAPackage("com.largata.itinerary.api..")))
                    .and(not(resideInAPackage("com.largata.postcard.api..")))
                    .and(not(resideInAPackage("com.largata.media..")))
                    .and(not(resideInAPackage("com.largata.trip.api..")));

    private final JavaClasses largata =
            new ClassFileImporter()
                    .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                    .importPackages("com.largata");

    @Test
    void theOnlyWayIntoTheFeedModuleIsItsRefusals() {
        noClasses()
                .that()
                .resideOutsideOfPackage(FEED + "..")
                .should()
                .dependOnClassesThat(BEHIND_THE_MODULES_FRONT_DOOR)
                .as("a module is reached by ID and service interface only (ADR-002) — an ALLOWLIST, so"
                        + " the implementation, the web edge and any subpackage added later are all"
                        + " covered without anyone remembering to name them. Feed has no"
                        + " in-process caller, so under ADR-038 rule 1 as amended on 11/09/2026 it"
                        + " has no api package at all and its refusals are the whole front door")
                .check(largata);
    }


    @Test
    void theFeedModuleComposesApisAndOwnsNoTable() {
        noClasses()
                .that()
                .resideInAPackage(FEED + "..")
                .should()
                .dependOnClassesThat(ANOTHER_MODULE)
                .as("feed is a COMPOSITION module: it owns no table and no query of its own, and reads"
                        + " postcard.api for the postcards, publication.api for each card's itinerary"
                        + " link, trip.api for the teasers and the archived set, and media for the"
                        + " photo bytes. An allowlist naming only API packages, never the modules")
                .check(largata);
    }

    @Test
    void theFeedModuleOwnsNoTableAndNoQueryOfItsOwn() {
        assertThat(
                        largata.that(resideInAPackage(FEED + "..")).stream()
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
        assertThat(largata.that(resideInAPackage(FEED + "..")))
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
        assertThat(largata.that(resideInAPackage(PUBLISHED_REFUSALS)))
                .as("and a front door matching nothing would make the rules unfalsifiable")
                .isNotEmpty();
    }
}
