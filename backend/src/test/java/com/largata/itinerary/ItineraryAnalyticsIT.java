package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
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
class ItineraryAnalyticsIT extends PostgresTestBase {

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
    void creatingAnItineraryEmitsExactlyOneEventWithTheFunnelsAttributes() {
        create(
                freshTraveler(),
                """
                {"title":"Hokkaido in winter","destinations":["Sapporo","Otaru"],"startDate":"2027-01-10"}
                """);

        assertThat(eventsNamed("itinerary_created"))
                .singleElement()
                .satisfies(
                        line -> {
                            assertThat(line.getMDCPropertyMap())
                                    .containsEntry("event.hasDates", "true")
                                    .containsEntry("event.destinationCount", "2")
                                    .containsKey("event.travelerId")
                                    .containsKey("event.itineraryId");
                        });
    }

    @Test
    void anUndatedItinerarySaysSo() {
        create(freshTraveler(), """
                {"title":"Japan, someday","destinations":["Japan"]}
                """);

        assertThat(eventsNamed("itinerary_created"))
                .singleElement()
                .satisfies(line -> assertThat(line.getMDCPropertyMap()).containsEntry("event.hasDates", "false"));
    }

    @Test
    void theEventNamesTheTripByIdAndLeaksNothingTheTravelerWrote() {
        create(
                freshTraveler(),
                """
                {"title":"Honeymoon in Bali","destinations":["Ubud","Seminyak"]}
                """);

        assertThat(eventsNamed("itinerary_created"))
                .singleElement()
                .satisfies(
                        line -> {
                            assertThat(line.getFormattedMessage()).doesNotContain("Honeymoon", "Ubud", "Seminyak");
                            assertThat(line.getMDCPropertyMap().values())
                                    .noneMatch(value -> value.contains("Honeymoon") || value.contains("Ubud"));
                        });
    }

    @Test
    void aRejectedCreateEmitsNothing() {
        rest.post()
                .uri("/v1/itineraries")
                .header(HttpHeaders.AUTHORIZATION, bearer(freshTraveler()))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"","destinations":[]}
                        """)
                .exchange()
                .expectStatus()
                .isBadRequest();

        assertThat(eventsNamed("itinerary_created")).isEmpty();
    }

    @Test
    void theOperationalLogLineNamesTheTripByIdAndLeaksNothingTheTravelerWrote() {
        ListAppender<ILoggingEvent> appLog = new ListAppender<>();
        appLog.start();
        ch.qos.logback.classic.Logger serviceLogger =
                (ch.qos.logback.classic.Logger) LoggerFactory.getLogger("com.largata.itinerary.ItineraryService");
        serviceLogger.addAppender(appLog);
        try {
            create(freshTraveler(), """
                    {"title":"Honeymoon in Bali","destinations":["Ubud"]}
                    """);

            assertThat(appLog.list)
                    .filteredOn(line -> line.getFormattedMessage().startsWith("Itinerary created"))
                    .singleElement()
                    .satisfies(line -> assertThat(line.getFormattedMessage()).doesNotContain("Honeymoon", "Ubud"));
        } finally {
            serviceLogger.detachAppender(appLog);
        }
    }

    @Test
    void eachLifecycleTransitionEmitsExactlyOneEventNamingTheTripAndTheOwner() {
        String owner = freshTraveler();
        String tripId = createAndReturnId(owner, """
                {"title":"Osaka 2027","destinations":["Osaka"]}
                """);

        transition(owner, tripId, "start");

        assertThat(eventsNamed("itinerary_started"))
                .singleElement()
                .satisfies(
                        line -> {
                            assertThat(line.getMDCPropertyMap())
                                    .containsEntry("event.itineraryId", tripId)
                                    .containsKey("event.travelerId");
                            assertThat(line.getFormattedMessage()).doesNotContain("Osaka");
                        });
        assertThat(eventsNamed("itinerary_completed")).isEmpty();

        transition(owner, tripId, "complete");

        assertThat(eventsNamed("itinerary_completed")).singleElement();
        assertThat(eventsNamed("itinerary_started")).as("starting did not fire twice").hasSize(1);
    }

    @Test
    void aRefusedTransitionEmitsNothing() {
        String owner = freshTraveler();
        String tripId = createAndReturnId(owner, """
                {"title":"Osaka 2027","destinations":["Osaka"]}
                """);

        rest.post()
                .uri("/v1/itineraries/" + tripId + "/complete")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .exchange()
                .expectStatus()
                .isEqualTo(409);

        assertThat(eventsNamed("itinerary_completed")).isEmpty();
        assertThat(eventsNamed("itinerary_started")).isEmpty();
    }

    @Test
    void aFirstContactEmitsTheSignupEventOnceAndOnlyOnce() {
        String token = freshTraveler();

        callMe(token);
        callMe(token);

        assertThat(eventsNamed("traveler_signed_up")).hasSize(1);
    }

    private void callMe(String token) {
        rest.get()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }

    private void create(String token, String body) {
        rest.post()
                .uri("/v1/itineraries")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange()
                .expectStatus()
                .isCreated();
    }


    private String createAndReturnId(String token, String body) {
        byte[] created =
                rest.post()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        String json = new String(created);
        int start = json.indexOf("\"id\":\"") + 6;
        return json.substring(start, json.indexOf('"', start));
    }

    private void transition(String token, String itineraryId, String act) {
        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/" + act)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }

    private java.util.List<ILoggingEvent> eventsNamed(String name) {
        return events.list.stream()
                .filter(line -> line.getFormattedMessage().equals("event=" + name))
                .toList();
    }

    private static String freshTraveler() {
        return TestJwtSupport.tokenFor("uid-" + UUID.randomUUID(), "analytics@example.com");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private static Logger analyticsLogger() {
        return (Logger) LoggerFactory.getLogger("com.largata.analytics");
    }
}
