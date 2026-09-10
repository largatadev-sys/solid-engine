package com.largata.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import com.largata.LargataApplication;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModule;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.core.Violations;


class ModulithVerificationTest {

    private static final ApplicationModules MODULES =
            ApplicationModules.of(LargataApplication.class);

    private static final List<String> REFUSALS = refusalsOf(MODULES);


    @Test
    void theRefusalReaderActuallyReadsRefusals() {
        assertThat(REFUSALS)
                .as("verify() MEMOISES, and so does ApplicationModules.of - the second caller is"
                        + " answered with silence whether or not the tree is clean. Calling it per"
                        + " test made this list empty while 128 breaches stood, and allMatch passed"
                        + " on nothing. It is captured ONCE above and read here; if it is ever empty"
                        + " every rule below is guarding air")
                .isNotEmpty();
    }


    private static List<String> refusalsOf(ApplicationModules modules) {
        try {
            modules.verify();
            return List.of();
        } catch (Violations refused) {
            return refused.getMessages();
        }
    }


    @Test
    void theOnlyBoundaryModulithRefusesIsTheDiaryAdaptersAlreadyCounted() {
        assertThat(String.join(System.lineSeparator(), REFUSALS))
                .as("Modulith reads the same tree the ArchUnit guards read and agrees with them:"
                        + " every module reaches its neighbours through a named interface, the"
                        + " kernel, identity and media are OPEN by classification (ADR-038), and the"
                        + " cycles it used to report went with the old package at ticket 10. What is"
                        + " left is the diary adapters ticket 09 relocated into postcard.legacy"
                        + " WITHOUT rewriting their reach into trip's plan entities — the same"
                        + " exemption TripModuleBoundaryTest counts, seen through a second tool. The"
                        + " epic-map line that cuts the five old Trip Diary screens over deletes the"
                        + " adapters, that exemption and this assertion together")
                .contains("postcard")
                .contains("trip");
    }


    @Test
    void nothingButPostcardIsRefused() {
        assertThat(REFUSALS)
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
                .contains("trip", "itinerary", "diary", "postcard", "discovery", "feed", "profile");
    }


    @Test
    void theScanFoundRealModulesRatherThanPassingVacuously() {
        assertThat(MODULES.stream().count())
                .as("a model that found nothing would verify cleanly and prove nothing at all")
                .isGreaterThan(10);
    }


}
