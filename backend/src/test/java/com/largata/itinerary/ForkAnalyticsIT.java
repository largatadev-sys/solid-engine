package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
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
import tools.jackson.databind.ObjectMapper;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class ForkAnalyticsIT extends PostgresTestBase {

    private RestTestClient rest;
    private ListAppender<ILoggingEvent> events;

    @LocalServerPort private int port;

    private static final ObjectMapper JSON = new ObjectMapper();

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
    void aForkEmitsExactlyOneEventNamingBothItinerariesAndTheForker() {
        String author = freshTraveler();
        String sourceId = publishedTrip(author);
        String forker = freshTraveler();

        fork(forker, sourceId).expectStatus().isCreated();

        assertThat(eventsNamed("itinerary_forked"))
                .singleElement()
                .satisfies(
                        line -> {
                            assertThat(line.getMDCPropertyMap())
                                    .containsEntry("event.sourceItineraryId", sourceId)
                                    .containsKey("event.itineraryId")
                                    .containsKey("event.travelerId");
                            assertThat(line.getMDCPropertyMap().get("event.itineraryId"))
                                    .as("the event names the copy, not the source, as its subject")
                                    .isNotEqualTo(sourceId);
                        });
    }


    @Test
    void aRefusedForkEmitsNothing() {
        String author = freshTraveler();
        String unpublished = trip(author);

        fork(freshTraveler(), unpublished).expectStatus().isNotFound();
        fork(freshTraveler(), UUID.randomUUID().toString()).expectStatus().isNotFound();

        assertThat(eventsNamed("itinerary_forked")).isEmpty();
    }


    @Test
    void theEventNamesTheTripsByIdAndLeaksNothingTheAuthorWrote() {
        String author = freshTraveler();
        String sourceId = publishedTrip(author, "Honeymoon in Bali", "Ubud");

        fork(freshTraveler(), sourceId).expectStatus().isCreated();

        assertThat(eventsNamed("itinerary_forked"))
                .singleElement()
                .satisfies(
                        line -> {
                            assertThat(line.getFormattedMessage()).doesNotContain("Honeymoon", "Ubud");
                            assertThat(line.getMDCPropertyMap().values())
                                    .noneMatch(value -> value.contains("Honeymoon") || value.contains("Ubud"));
                        });
    }


    private RestTestClient.ResponseSpec fork(String token, String sourceId) {
        return rest.post()
                .uri("/v1/itineraries/" + sourceId + "/fork")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }


    private String publishedTrip(String token) {
        return publishedTrip(token, "Island Hopping in El Nido", "Palawan");
    }


    private String publishedTrip(String token, String title, String destination) {
        String tripId = trip(token, title, destination);
        publish(token, tripId);
        return tripId;
    }


    private String trip(String token) {
        return trip(token, "Island Hopping in El Nido", "Palawan");
    }


    private String trip(String token, String title, String destination) {
        return JSON.readTree(
                        new String(
                                rest.post()
                                        .uri("/v1/itineraries")
                                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .body(
                                                "{\"title\":\""
                                                        + title
                                                        + "\",\"destination\":\""
                                                        + destination
                                                        + "\",\"durationDays\":1}")
                                        .exchange()
                                        .expectStatus()
                                        .isCreated()
                                        .expectBody()
                                        .returnResult()
                                        .getResponseBodyContent()))
                .get("id")
                .asString();
    }


    private final Set<String> travelled = new HashSet<>();

    private void publish(String token, String itineraryId) {
        if (travelled.add(itineraryId)) {
            act(token, itineraryId, "finish-planning");
            act(token, itineraryId, "start");
            act(token, itineraryId, "complete");
        }
        act(token, itineraryId, "publish");
    }


    private void act(String token, String itineraryId, String verb) {
        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/" + verb)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private List<ILoggingEvent> eventsNamed(String name) {
        return events.list.stream()
                .filter(line -> line.getFormattedMessage().equals("event=" + name))
                .toList();
    }


    private static Logger analyticsLogger() {
        return (Logger) LoggerFactory.getLogger("com.largata.analytics");
    }


    private static String freshTraveler() {
        return TestJwtSupport.tokenFor(
                "uid-" + UUID.randomUUID(), "traveler-" + UUID.randomUUID() + "@example.com");
    }


    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
