package com.largata.diary;

import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThat;

import com.largata.diary.entity.Diary;
import com.largata.diary.entity.DiaryDay;
import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaMethodCall;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;


class DiaryModuleBoundaryTest {

    private static final String DIARY = "com.largata.diary";

    private static final Map<Class<?>, List<String>> SEALED =
            Map.of(
                    Diary.class,
                    List.of("standalone", "mintedForTrip", "coverDay", "describe", "widenTo", "touch"),
                    DiaryDay.class,
                    List.of("on", "snapshotOfTripDay", "moveTo"));

    private static final DescribedPredicate<JavaMethodCall> A_SEALED_MEMBER =
            new DescribedPredicate<>("a factory or mutator of Diary or DiaryDay") {
                @Override
                public boolean test(JavaMethodCall call) {
                    for (Map.Entry<Class<?>, List<String>> entry : SEALED.entrySet()) {
                        if (call.getTargetOwner().isEquivalentTo(entry.getKey())
                                && entry.getValue().contains(call.getTarget().getName())) {
                            return true;
                        }
                    }
                    return false;
                }
            };

    private final JavaClasses largata =
            new ClassFileImporter()
                    .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                    .importPackages("com.largata");

    @Test
    void onlyTheDiaryModuleCreatesOrChangesADiaryOrADay() {
        noClasses()
                .that()
                .resideOutsideOfPackage(DIARY + "..")
                .should()
                .callMethodWhere(A_SEALED_MEMBER)
                .as("the layer split made these public; postcard already holds Diary and DiaryDay,"
                        + " so this is the seal that keeps that a read. Scaffolding until the"
                        + " content-module boundary story hands postcard a view instead of the entity")
                .check(largata);
    }

    @Test
    void everySealedNameStillExistsOnItsClass() {
        for (Map.Entry<Class<?>, List<String>> entry : SEALED.entrySet()) {
            JavaClass owner = largata.get(entry.getKey());
            for (String name : entry.getValue()) {
                assertThat(owner.getMethods().stream().anyMatch(m -> m.getName().equals(name)))
                        .as("a rename would silently un-guard %s.%s", owner.getSimpleName(), name)
                        .isTrue();
            }
        }
    }

    @Test
    void theBoundaryTestSeesTheModuleItGuards() {
        assertThat(largata.that(resideInAPackage(DIARY + "..")))
                .as("guards against a vacuously passing rule - the import must have found the module")
                .hasSizeGreaterThan(25);
    }

    @Test
    void theSealedPredicateActuallySelectsSomething() {
        long sealedCallsInsideTheModule =
                largata.that(resideInAPackage(DIARY + "..")).stream()
                        .flatMap(c -> c.getMethodCallsFromSelf().stream())
                        .filter(A_SEALED_MEMBER)
                        .count();
        assertThat(sealedCallsInsideTheModule)
                .as("the module itself must exercise the sealed members, or the predicate matches nothing")
                .isGreaterThan(5);
    }
}
