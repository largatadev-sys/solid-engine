package com.largata.identity.web;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class OnboardingAnalyticsIT extends PostgresTestBase {

    private RestTestClient rest;
    private ListAppender<ILoggingEvent> events;

    @LocalServerPort private int port;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        events = new ListAppender<>();
        events.start();
        analyticsLogger().addAppender(events);
    }

    @AfterEach
    void tearDown() {
        analyticsLogger().detachAppender(events);
    }

    @Test
    void choosingEarnEmitsItsOwnSignalWhichIsTheOnlyReasonTheOptionShips() {
        patch(freshTraveler(), "{\"goals\":[\"discover\",\"earn\"]}");

        assertThat(eventsNamed("earn_intent_signalled")).hasSize(1);
        assertThat(eventsNamed("onboarding_goals_selected")).hasSize(1);
    }

    @Test
    void notChoosingEarnEmitsNoEarnSignal() {
        patch(freshTraveler(), "{\"goals\":[\"discover\",\"plan\"]}");

        assertThat(eventsNamed("earn_intent_signalled")).isEmpty();
        assertThat(eventsNamed("onboarding_goals_selected")).hasSize(1);
    }

    @Test
    void aProfilePatchThatCarriesNoGoalsEmitsNoGoalEvent() {
        patch(freshTraveler(), "{\"bio\":\"Chasing ferries.\"}");

        assertThat(eventsNamed("onboarding_goals_selected")).isEmpty();
        assertThat(eventsNamed("onboarding_interests_selected")).isEmpty();
    }

    @Test
    void interestSelections_areMeasuredTooSinceTheSpecNamesGoalAndInterestSelections() {
        patch(freshTraveler(), "{\"interests\":[\"food\",\"hiking\",\"art\"]}");

        assertThat(eventsNamed("onboarding_interests_selected")).hasSize(1);
        assertThat(eventsNamed("onboarding_goals_selected")).isEmpty();
    }

    @Test
    void oneStepThatCarriesBothIsMeasuredAsBothRatherThanOne() {
        patch(freshTraveler(), "{\"goals\":[\"discover\"],\"interests\":[\"food\",\"art\",\"hiking\"]}");

        assertThat(eventsNamed("onboarding_goals_selected")).hasSize(1);
        assertThat(eventsNamed("onboarding_interests_selected")).hasSize(1);
    }

    @Test
    void completionEmitsExactlyOneEventNoMatterHowOftenItIsCalled() {
        String token = freshTraveler();

        complete(token);
        complete(token);

        assertThat(eventsNamed("onboarding_completed")).hasSize(1);
    }

    @Test
    void aRejectedHandleEmitsNothing() {
        patch(freshTraveler(), "{\"handle\":\"admin\",\"goals\":[\"earn\"]}");

        assertThat(eventsNamed("onboarding_goals_selected")).isEmpty();
        assertThat(eventsNamed("earn_intent_signalled")).isEmpty();
    }

    private void patch(String token, String body) {
        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    private void complete(String token) {
        rest.post()
                .uri("/v1/me/onboarding-completion")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }

    private List<ILoggingEvent> eventsNamed(String name) {
        return events.list.stream().filter(line -> line.getFormattedMessage().equals("event=" + name)).toList();
    }

    private static String freshTraveler() {
        String uid = "uid-" + UUID.randomUUID();
        return TestJwtSupport.verifiedToken(uid, uid + "@example.com");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private static Logger analyticsLogger() {
        return (Logger) LoggerFactory.getLogger("com.largata.analytics");
    }
}
