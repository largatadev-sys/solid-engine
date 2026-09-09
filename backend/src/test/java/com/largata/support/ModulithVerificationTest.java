package com.largata.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import com.largata.LargataApplication;
import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModule;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.core.Violations;


class ModulithVerificationTest {

    private static final ApplicationModules MODULES =
            ApplicationModules.of(LargataApplication.class);


    @Test
    void theOnlyBoundaryModulithRefusesIsTheDiaryAdaptersAlreadyCounted() {
        assertThatExceptionOfType(Violations.class)
                .as("Modulith reads the same tree the ArchUnit guards read and agrees with them:"
                        + " every module reaches its neighbours through a named interface, the"
                        + " kernel, identity and media are OPEN by classification (ADR-038), and the"
                        + " cycles it used to report went with the old package at ticket 10. What is"
                        + " left is the diary adapters ticket 09 relocated into postcard.legacy"
                        + " WITHOUT rewriting their reach into trip's plan entities — the same"
                        + " exemption TripModuleBoundaryTest counts, seen through a second tool. The"
                        + " epic-map line that cuts the five old Trip Diary screens over deletes the"
                        + " adapters, that exemption and this assertion together")
                .isThrownBy(MODULES::verify)
                .withMessageContaining("postcard")
                .withMessageContaining("trip");
    }


    @Test
    void nothingButPostcardIsRefused() {
        assertThat(refusals())
                .as("a second module appearing here is a NEW breach, not the recorded one — this is"
                        + " what keeps the assertion above from quietly covering something else")
                .allMatch(line -> !line.contains("Module '") || line.contains("Module 'postcard'"));
    }


    @Test
    void everyModuleInTheTreeIsInTheModel() {
        assertThat(MODULES.stream().map(ApplicationModule::getIdentifier).map(Object::toString).toList())
                .as("Modulith derives a module per top-level package, which is exactly how this tree"
                        + " is cut — a package that stops appearing here has been absorbed by"
                        + " another, and that is a boundary change nobody should make silently")
                .contains("trip", "publication", "diary", "postcard", "discovery", "feed", "profile");
    }


    @Test
    void theScanFoundRealModulesRatherThanPassingVacuously() {
        assertThat(MODULES.stream().count())
                .as("a model that found nothing would verify cleanly and prove nothing at all")
                .isGreaterThan(10);
    }


    private static java.util.List<String> refusals() {
        try {
            MODULES.verify();
            return java.util.List.of();
        } catch (Violations refused) {
            return refused.getMessages();
        }
    }
}
