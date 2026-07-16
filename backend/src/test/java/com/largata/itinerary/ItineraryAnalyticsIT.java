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

/**
 * Ticket 04's ACs through the real chain: the events register #2's default set asks for, emitted
 * from a real request against a real database.
 *
 * <p>The sink's own behaviour is unit-tested ({@code LoggingAnalyticsTest}); what needs a running
 * app is the <em>call sites</em> — that a create emits exactly one event, after its transaction
 * commits, carrying no PII.
 */
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
        // P3, extended to analytics: a title and a destination are the traveler's words about their
        // own life. The funnel needs "was a trip made, with how many destinations" — never "to
        // where, called what". The sink is a log line today and a durable store before alpha; both
        // outlive the request by longer than any of this is worth.
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
        // The event reports a committed row. A validation failure never reaches the service, so the
        // funnel must not count it — an event for a trip that does not exist is a lie about the one
        // number this event exists to give.
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
        // 06b §4 wants an info line per successful operation; P3 says it names entities by id. This
        // line is not the analytics event — it rides the app's own logger, for an operator reading
        // what the system did — and it is held to the same no-PII rule.
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
    void aFirstContactEmitsTheSignupEventOnceAndOnlyOnce() {
        // The funnel's first stage, backfilled at S0.3. The second call re-reads an existing
        // Traveler — two signups for one traveler would misreport the number the event exists for.
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
