package com.largata.publication;

import static com.tngtech.archunit.base.DescribedPredicate.not;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAnyPackage;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.simpleName;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;


class PublicationModuleBoundaryTest {

    private static final String PUBLICATION = "com.largata.publication";

    private static final String[] FRONT_DOOR = {PUBLICATION + ".exception.."};

    private static final DescribedPredicate<JavaClass> THE_ONE_NAMED_EXEMPTION =
            resideInAPackage(PUBLICATION + ".service").and(simpleName("ItineraryObjectService"));

    private static final DescribedPredicate<JavaClass> BEHIND_THE_MODULES_FRONT_DOOR =
            resideInAPackage(PUBLICATION + "..")
                    .and(not(resideInAnyPackage(FRONT_DOOR)))
                    .and(not(THE_ONE_NAMED_EXEMPTION));

    private final JavaClasses largata =
            new ClassFileImporter()
                    .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                    .importPackages("com.largata");

    @Test
    void theOnlyWayIntoThePublicationModuleIsItsRefusalsAndOneNamedService() {
        noClasses()
                .that()
                .resideOutsideOfPackage(PUBLICATION + "..")
                .should()
                .dependOnClassesThat(BEHIND_THE_MODULES_FRONT_DOOR)
                .as("the layer split made the entity's factory and mutators public; this keeps"
                        + " ItineraryObject, its repository, the plan snapshot and the wire records"
                        + " inside the module. ItineraryObjectService is exempted BY NAME because"
                        + " diary's profile controller injects the concrete class today - the"
                        + " content-module boundary story replaces that with a PublicationApi and"
                        + " this exemption goes with it")
                .check(largata);
    }

    @Test
    void theBoundaryTestSeesTheModuleItGuards() {
        assertThat(largata.that(resideInAPackage(PUBLICATION + "..")))
                .as("guards against a vacuously passing rule - the import must have found the module")
                .hasSizeGreaterThan(6);
    }

    @Test
    void theExemptionNamesARealClassAndThePredicateSelectsSomething() {
        assertThat(largata.that(THE_ONE_NAMED_EXEMPTION))
                .as("an exemption naming nothing would be a rule that only looks scoped")
                .hasSize(1);
        assertThat(largata.that(BEHIND_THE_MODULES_FRONT_DOOR))
                .as("a predicate matching nothing would pass the rule above while guarding nothing")
                .isNotEmpty();
    }
}
