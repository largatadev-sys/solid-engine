package com.largata.membership;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class ArchivedTripListIT extends PostgresTestBase {

    private RestTestClient rest;
    private ListAppender<ILoggingEvent> events;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

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
    void archivingMovesATripFromTheDefaultListToTheArchivedView() {
        String owner = freshTraveler();
        String kept = createItinerary(owner);
        String archived = createItinerary(owner);

        assertThat(listIds(owner, false)).containsExactlyInAnyOrder(kept, archived);
        assertThat(listIds(owner, true)).isEmpty();

        archive(owner, archived).expectStatus().isOk();

        assertThat(listIds(owner, false)).as("the default list tidies").containsExactly(kept);
        assertThat(listIds(owner, true)).as("and nothing is lost").containsExactly(archived);

        unarchive(owner, archived).expectStatus().isOk();

        assertThat(listIds(owner, false)).containsExactlyInAnyOrder(kept, archived);
        assertThat(listIds(owner, true)).isEmpty();
    }


    @Test
    void aMemberLosesTheArchivedTripFromBothViewsWhileTheOwnerKeepsIt() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);

        assertThat(listIds(member, false)).containsExactly(tripId);

        archive(owner, tripId).expectStatus().isOk();

        assertThat(listIds(member, false)).as("it leaves their default list").isEmpty();
        assertThat(listIds(member, true))
                .as("and their archived view too — archived is owner-only sight, ADR-017's ladder")
                .isEmpty();
        assertThat(listIds(owner, true)).as("the owner is unaffected").containsExactly(tripId);

        unarchive(owner, tripId).expectStatus().isOk();

        assertThat(listIds(member, false)).as("unarchive restores their sight in full").containsExactly(tripId);
    }


    @Test
    void theArchivedFlagOnTheWireMatchesTheViewRequested() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);

        assertThat(listBody(owner, false)).contains("\"archived\":false");

        archive(owner, tripId).expectStatus().isOk();

        assertThat(listBody(owner, true)).contains("\"archived\":true");
    }


    @Test
    void theArchivedFlagAgreesWithTheStoredState_notMerelyWithTheQueryString() {
        String owner = freshTraveler();
        String kept = createItinerary(owner);
        String archived = createItinerary(owner);
        archive(owner, archived).expectStatus().isOk();

        assertThat(listIds(owner, true)).allSatisfy(id -> assertThat(storedStateOf(id)).isEqualTo("ARCHIVED"));
        assertThat(listIds(owner, false)).allSatisfy(id -> assertThat(storedStateOf(id)).isEqualTo("ACTIVE"));

        assertThat(listIds(owner, false)).as("the live view still holds the untouched trip").contains(kept);
    }

    private String storedStateOf(String itineraryId) {
        return jdbc.queryForObject(
                "SELECT state FROM workspace WHERE itinerary_id = ?", String.class, UUID.fromString(itineraryId));
    }


    @Test
    void keysetPagingWorksInBothViews() {
        String owner = freshTraveler();
        String first = createItinerary(owner);
        String second = createItinerary(owner);
        String third = createItinerary(owner);

        assertThat(listIds(owner, false)).containsExactly(third, second, first);

        String firstPageCursor = pageThrough(owner, false, 2);
        assertThat(firstPageCursor).as("a second page exists").isNotNull();

        archive(owner, first).expectStatus().isOk();
        archive(owner, second).expectStatus().isOk();
        archive(owner, third).expectStatus().isOk();

        assertThat(listIds(owner, true)).containsExactly(third, second, first);
        assertThat(pageThrough(owner, true, 2)).as("the archived view pages the same way").isNotNull();
    }


    @Test
    void eachActEmitsExactlyOneEventNamingTheTripAndTheOwner() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        UUID ownerId = travelerIdOf(owner);

        archive(owner, tripId).expectStatus().isOk();

        assertThat(eventsNamed("itinerary_archived"))
                .singleElement()
                .satisfies(line -> assertThat(line.getMDCPropertyMap())
                        .containsEntry("event.itineraryId", tripId)
                        .containsEntry("event.travelerId", ownerId.toString()));
        assertThat(eventsNamed("itinerary_unarchived")).isEmpty();

        unarchive(owner, tripId).expectStatus().isOk();

        assertThat(eventsNamed("itinerary_unarchived")).hasSize(1);
        assertThat(eventsNamed("itinerary_archived")).as("the first act is not re-counted").hasSize(1);
    }


    @Test
    void aRefusedTransitionEmitsNoEvent() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);

        unarchive(owner, tripId).expectStatus().isEqualTo(409);
        assertThat(eventsNamed("itinerary_unarchived")).isEmpty();

        archive(owner, tripId).expectStatus().isOk();
        archive(owner, tripId).expectStatus().isEqualTo(409);
        assertThat(eventsNamed("itinerary_archived")).as("only the act that happened counts").hasSize(1);
    }


    private List<ILoggingEvent> eventsNamed(String name) {
        return events.list.stream()
                .filter(line -> ("event=" + name).equals(line.getFormattedMessage()))
                .toList();
    }

    private RestTestClient.ResponseSpec archive(String token, String itineraryId) {
        return rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/archive")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }

    private RestTestClient.ResponseSpec unarchive(String token, String itineraryId) {
        return rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/unarchive")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }

    private String listBody(String token, boolean archived) {
        return new String(
                rest.get()
                        .uri("/v1/itineraries?archived=" + archived)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent());
    }


    private List<String> listIds(String token, boolean archived) {
        return idsIn(listBody(token, archived));
    }


    private String pageThrough(String token, boolean archived, int limit) {
        String body =
                new String(
                        rest.get()
                                .uri("/v1/itineraries?archived=" + archived + "&limit=" + limit)
                                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                                .exchange()
                                .expectStatus()
                                .isOk()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent());
        assertThat(idsIn(body)).as("a full page was returned").hasSize(limit);
        int at = body.indexOf("\"nextCursor\":\"");
        return at < 0 ? null : body.substring(at + 14, body.indexOf('"', at + 14));
    }


    private static List<String> idsIn(String json) {
        return java.util.regex.Pattern.compile("\"id\":\"([^\"]+)\"")
                .matcher(json)
                .results()
                .map(match -> match.group(1))
                .toList();
    }

    private String admitMemberTo(String itineraryId) {
        String memberToken = freshTraveler();
        UUID memberId = travelerIdOf(memberToken);
        UUID workspaceId =
                jdbc.queryForObject(
                        "SELECT id FROM workspace WHERE itinerary_id = ?", UUID.class, UUID.fromString(itineraryId));
        jdbc.update(
                "INSERT INTO membership (workspace_id, traveler_id, role, joined_at) VALUES (?, ?, 'MEMBER', ?)",
                workspaceId,
                memberId,
                Timestamp.from(Instant.now()));
        return memberToken;
    }

    private UUID travelerIdOf(String token) {
        return UUID.fromString(
                fieldIn(
                        rest.get()
                                .uri("/v1/me")
                                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                                .exchange()
                                .expectStatus()
                                .isOk()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent(),
                        "id"));
    }

    private String createItinerary(String token) {
        byte[] created =
                rest.post()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                        {"title":"Listable trip","destination":"Cebu"}
                        """)
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return fieldIn(created, "id");
    }

    private static String fieldIn(byte[] body, String field) {
        String json = new String(body);
        String needle = "\"" + field + "\":\"";
        int start = json.indexOf(needle) + needle.length();
        return json.substring(start, json.indexOf('"', start));
    }

    private static String freshTraveler() {
        return TestJwtSupport.tokenFor("uid-" + UUID.randomUUID(), "traveler-" + UUID.randomUUID() + "@example.com");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private static Logger analyticsLogger() {
        return (Logger) LoggerFactory.getLogger("com.largata.analytics");
    }
}
