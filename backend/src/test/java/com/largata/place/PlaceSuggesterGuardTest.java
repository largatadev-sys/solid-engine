package com.largata.place;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.place.api.PlaceSuggester;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;


class PlaceSuggesterGuardTest {

    private static final String USER_AGENT = "largata.place.user-agent=Largata/test";

    private static final String REVERSE = "largata.place.photon-reverse-url=https://photon.test/reverse";

    private final ApplicationContextRunner context =
            new ApplicationContextRunner().withUserConfiguration(PlaceSuggesterConfig.class);

    @Test
    void aDeploymentWithNoGeocoderAndNoOptInREFUSESToStart() {
        context.withPropertyValues(
                        "largata.place.photon-url=",
                        "largata.place.fixture-allowed=false",
                        REVERSE,
                        USER_AGENT)
                .run(started ->
                        assertThat(started)
                                .as("a rung serving eight hardcoded places in silence is the failure"
                                        + " this refusal exists to make loud")
                                .hasFailed()
                                .getFailure()
                                .hasMessageContaining("LARGATA_PHOTON_URL"));
    }


    @Test
    void theRefusalNamesBOTHWaysOut_soNobodyHasToReadThisFileToFixIt() {
        assertThat(PlaceSuggesterConfig.NO_GEOCODER)
                .contains("LARGATA_PHOTON_URL")
                .contains("LARGATA_PLACE_FIXTURE_ALLOWED");
    }


    @Test
    void optingInGivesTheFixture_whichIsWhatTheSuiteAndALocalRunWant() {
        context.withPropertyValues(
                        "largata.place.photon-url=",
                        "largata.place.fixture-allowed=true",
                        REVERSE,
                        USER_AGENT)
                .run(started ->
                        assertThat(started)
                                .hasNotFailed()
                                .getBean(PlaceSuggester.class)
                                .isInstanceOf(FixturePlaceSuggester.class));
    }


    @Test
    void aConfiguredGeocoderNeedsNoOptIn_becauseTheFixtureIsNotEvenACandidate() {
        context.withPropertyValues(
                        "largata.place.photon-url=https://photon.test/api",
                        "largata.place.fixture-allowed=false",
                        REVERSE,
                        USER_AGENT)
                .run(started ->
                        assertThat(started)
                                .hasNotFailed()
                                .getBean(PlaceSuggester.class)
                                .isInstanceOf(PhotonPlaceSuggester.class));
    }


    @Test
    void exactlyOneSuggesterExistsInEitherDirection() {
        for (String photonUrl : new String[] {"", "https://photon.test/api"}) {
            context.withPropertyValues(
                            "largata.place.photon-url=" + photonUrl,
                            "largata.place.fixture-allowed=true",
                            REVERSE,
                            USER_AGENT)
                    .run(started ->
                            assertThat(started)
                                    .as("the two beans are a mutually exclusive pair, never a"
                                            + " @ConditionalOnMissingBean tiebreak — the WS-1 finding")
                                    .getBeans(PlaceSuggester.class)
                                    .hasSize(1));
        }
    }
}
