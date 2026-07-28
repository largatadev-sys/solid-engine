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

/**
 * S1.9 ticket 02's list half and its events (spec ACs 11, 12): archived trips leave the default My
 * Trips list and appear in the archived view, for members as well as the owner — and each act reports
 * itself exactly once, after commit.
 */
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

    // --- the list splits (spec AC 11) -------------------------------------------------------------

    /**
     * The default list is the live trips; {@code ?archived=true} is the other half. Neither loses a
     * trip — the point of archiving rather than deleting.
     */
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

    /**
     * <strong>Members see the archived trip too</strong> (spec decision 10). Hiding it from the people
     * on it would repeat, one level up, the failure S1.5 had to fix in copy: a trip vanishing with no
     * explanation reads as data loss rather than a state change.
     */
    @Test
    void aMemberSeesTheArchivedTripInTheirArchivedViewNotJustTheOwner() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);

        assertThat(listIds(member, false)).containsExactly(tripId);

        archive(owner, tripId).expectStatus().isOk();

        assertThat(listIds(member, false)).as("it leaves their default list too").isEmpty();
        assertThat(listIds(member, true)).as("but they can still find it").containsExactly(tripId);
    }

    /** Every row of a page carries the archived flag matching the view it was asked for. */
    @Test
    void theArchivedFlagOnTheWireMatchesTheViewRequested() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);

        assertThat(listBody(owner, false)).contains("\"archived\":false");

        archive(owner, tripId).expectStatus().isOk();

        assertThat(listBody(owner, true)).contains("\"archived\":true");
    }

    /**
     * Paging is unaffected by the filter (spec AC 11's second half).
     *
     * <p>The filter narrows the <em>id set</em> before the keyset query runs, so {@code id < cursor}
     * behaves exactly as S1.6 shipped it — which is the reason the filter lives on the membership side
     * rather than as a predicate in the page query, where it would have had to be carried in the cursor
     * to stay stable across pages.
     */
    @Test
    void keysetPagingWorksInBothViews() {
        String owner = freshTraveler();
        String first = createItinerary(owner);
        String second = createItinerary(owner);
        String third = createItinerary(owner);

        // Newest first: UUIDv7 ids sort by creation time, so the page order is third, second, first.
        assertThat(listIds(owner, false)).containsExactly(third, second, first);

        String firstPageCursor = pageThrough(owner, false, 2);
        assertThat(firstPageCursor).as("a second page exists").isNotNull();

        archive(owner, first).expectStatus().isOk();
        archive(owner, second).expectStatus().isOk();
        archive(owner, third).expectStatus().isOk();

        assertThat(listIds(owner, true)).containsExactly(third, second, first);
        assertThat(pageThrough(owner, true, 2)).as("the archived view pages the same way").isNotNull();
    }

    // --- the events (spec AC 12) ------------------------------------------------------------------

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

    /**
     * A refused act reports nothing. An event that fired on a 409 would count decisions the system
     * declined to make — the reasoning {@code ItineraryAnalyticsIT} applies to a rejected create and
     * {@code MemberDepartureAnalyticsIT} to an idempotent repeat.
     */
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

    // --- fixtures ---------------------------------------------------------------------------------

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

    /** The ids in the requested view, in page order. */
    private List<String> listIds(String token, boolean archived) {
        return idsIn(listBody(token, archived));
    }

    /** Reads one page of the given size and returns its {@code nextCursor}, or null if exhausted. */
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

    /** Every {@code "id":"…"} in a list body, in order — the items' ids, since only items carry one. */
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
                        {"title":"Listable trip","destinations":["Cebu"]}
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
