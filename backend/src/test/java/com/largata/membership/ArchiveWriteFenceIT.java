package com.largata.membership;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class ArchiveWriteFenceIT extends PostgresTestBase {


    private static final String VALID_ITINERARY_PATCH =
            """
            {"title":"Renamed while frozen","destinations":["Cebu"]}
            """;

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void everyActOnAnArchivedTripIsRefused() {
        Trip trip = liveTripWithTwoMembers();
        UUID dayId = firstDayOf(trip.id);
        UUID activityId = createActivity(trip.owner, trip.id, dayId);
        acquireLease(trip.owner, trip.id).expectStatus().isOk();

        archive(trip.owner, trip.id).expectStatus().isOk();

        refused(patch(trip.owner, "/v1/itineraries/" + trip.id, VALID_ITINERARY_PATCH));
        refused(post(trip.owner, "/v1/itineraries/" + trip.id + "/days", """
                {"title":"A new day"}
                """));
        refused(patch(trip.owner, "/v1/itineraries/" + trip.id + "/days/" + dayId, """
                {"title":"Renamed day"}
                """));
        refused(delete(trip.owner, "/v1/itineraries/" + trip.id + "/days/" + dayId));
        refused(post(trip.owner, "/v1/itineraries/" + trip.id + "/days/" + dayId + "/activities", """
                {"title":"A new activity"}
                """));
        refused(patch(
                trip.owner,
                "/v1/itineraries/" + trip.id + "/days/" + dayId + "/activities/" + activityId,
                """
                {"title":"Renamed activity"}
                """));
        refused(delete(
                trip.owner, "/v1/itineraries/" + trip.id + "/days/" + dayId + "/activities/" + activityId));
        refused(put(
                trip.owner,
                "/v1/itineraries/" + trip.id + "/days/" + dayId + "/activities/order",
                "{\"expectedActivityIds\":[\""
                        + activityId
                        + "\"],\"activityIds\":[\""
                        + activityId
                        + "\"]}"));
        refused(post(
                trip.owner,
                "/v1/itineraries/" + trip.id + "/days/" + dayId + "/activities/" + activityId + "/move",
                "{\"targetDayId\":\"" + dayId + "\"}"));

        refused(post(trip.owner, "/v1/itineraries/" + trip.id + "/finish-planning", null));
        refused(post(trip.owner, "/v1/itineraries/" + trip.id + "/start", null));
        refused(post(trip.owner, "/v1/itineraries/" + trip.id + "/complete", null));

        refused(post(trip.owner, "/v1/itineraries/" + trip.id + "/edit-lock", null));
        refused(post(trip.owner, "/v1/itineraries/" + trip.id + "/edit-lock/renew", null));

        refused(post(trip.owner, "/v1/itineraries/" + trip.id + "/invitations", """
                {"email":"someone@example.com"}
                """));
        refused(post(trip.owner, "/v1/invitations/" + trip.pendingInvitationId + "/revoke", null));
        refused(post(
                trip.owner,
                "/v1/itineraries/" + trip.id + "/ownership-offer",
                "{\"travelerId\":\"" + trip.memberId + "\"}"));
        refused(delete(trip.owner, "/v1/itineraries/" + trip.id + "/ownership-offer"));

        refused(delete(trip.owner, "/v1/itineraries/" + trip.id + "/members/" + trip.memberId));
    }



    @Test
    void anArchivedTripTellsAMemberItDoesNotExist_notThatItIsFrozen() {
        Trip trip = liveTripWithTwoMembers();
        UUID dayId = firstDayOf(trip.id);
        archive(trip.owner, trip.id).expectStatus().isOk();

        masked(post(trip.member, "/v1/itineraries/" + trip.id + "/days", """
                {"title":"While frozen"}
                """));
        masked(delete(trip.member, "/v1/itineraries/" + trip.id + "/days/" + dayId));
    }


    @Test
    void everyFencedWriteFamilyAnswersAMemberWithTheMask() {
        Trip trip = liveTripWithTwoMembers();
        UUID dayId = firstDayOf(trip.id);
        UUID activityId = createActivity(trip.owner, trip.id, dayId);

        archive(trip.owner, trip.id).expectStatus().isOk();

        masked(patch(trip.member, "/v1/itineraries/" + trip.id, VALID_ITINERARY_PATCH));
        masked(post(trip.member, "/v1/itineraries/" + trip.id + "/days/" + dayId + "/activities", """
                {"title":"A new activity"}
                """));
        masked(patch(
                trip.member,
                "/v1/itineraries/" + trip.id + "/days/" + dayId + "/activities/" + activityId,
                """
                {"title":"Renamed activity"}
                """));
        masked(delete(
                trip.member, "/v1/itineraries/" + trip.id + "/days/" + dayId + "/activities/" + activityId));
        masked(put(
                trip.member,
                "/v1/itineraries/" + trip.id + "/days/" + dayId + "/activities/order",
                "{\"expectedActivityIds\":[\"" + activityId + "\"],\"activityIds\":[\"" + activityId + "\"]}"));
        masked(post(
                trip.member,
                "/v1/itineraries/" + trip.id + "/days/" + dayId + "/activities/" + activityId + "/move",
                "{\"targetDayId\":\"" + dayId + "\"}"));

        masked(post(trip.member, "/v1/itineraries/" + trip.id + "/edit-lock", null));
        masked(post(trip.member, "/v1/itineraries/" + trip.id + "/edit-lock/renew", null));

        masked(post(trip.member, "/v1/itineraries/" + trip.id + "/invitations", """
                {"email":"someone@example.com"}
                """));
        masked(post(trip.member, "/v1/invitations/" + trip.pendingInvitationId + "/revoke", null));
        masked(post(
                trip.member,
                "/v1/itineraries/" + trip.id + "/ownership-offer",
                "{\"travelerId\":\"" + trip.memberId + "\"}"));
        masked(delete(trip.member, "/v1/itineraries/" + trip.id + "/ownership-offer"));

        masked(delete(trip.member, "/v1/itineraries/" + trip.id + "/members/" + trip.ownerId));
    }

    @Test
    void releasingTheEditLockIsNotFencedThoughAcquiringIs() {
        Trip trip = liveTripWithTwoMembers();
        archive(trip.owner, trip.id).expectStatus().isOk();

        refused(post(trip.owner, "/v1/itineraries/" + trip.id + "/edit-lock", null));
        delete(trip.owner, "/v1/itineraries/" + trip.id + "/edit-lock").expectStatus().isNoContent();
    }

    @Test
    void aMemberCanStillLeaveAnArchivedTrip() {
        Trip trip = liveTripWithTwoMembers();
        archive(trip.owner, trip.id).expectStatus().isOk();

        delete(trip.member, "/v1/itineraries/" + trip.id + "/members/" + trip.memberId)
                .expectStatus()
                .isNoContent();

        assertThat(membershipCountOn(trip.id)).as("they are genuinely gone, not merely told yes").isEqualTo(1);
    }


    @Test
    void acceptAndDeclineAreClosedByVoidingRatherThanByTheFence() {
        Trip trip = liveTripWithTwoMembers();
        post(trip.owner, "/v1/itineraries/" + trip.id + "/ownership-offer", "{\"travelerId\":\"" + trip.memberId + "\"}")
                .expectStatus()
                .isCreated();

        archive(trip.owner, trip.id).expectStatus().isOk();

        post(trip.member, "/v1/itineraries/" + trip.id + "/ownership-offer/accept", null)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("OFFER_NOT_FOUND");
        post(trip.member, "/v1/itineraries/" + trip.id + "/ownership-offer/decline", null)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("OFFER_NOT_FOUND");
    }


    @Test
    void archivingShutsAStrangersPendingInvitationTooNotJustTheOwnershipOffer() {
        Trip trip = liveTripWithTwoMembers();
        String invitee =
                TestJwtSupport.verifiedToken("uid-" + UUID.randomUUID(), trip.pendingInvitationEmail);

        archive(trip.owner, trip.id).expectStatus().isOk();

        post(invitee, "/v1/invitations/" + trip.pendingInvitationId + "/accept", null)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ILLEGAL_TRANSITION");
        post(invitee, "/v1/invitations/" + trip.pendingInvitationId + "/decline", null)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ILLEGAL_TRANSITION");

        assertThat(membershipCountOn(trip.id))
                .as("a frozen trip admits nobody, whichever door they arrive at")
                .isEqualTo(2);
    }


    @Test
    void theMaskIsAnsweredBeforeThePermissionRefusalItWouldOtherwiseNameTheTripThrough() {
        Trip trip = liveTripWithTwoMembers();
        String stranger = freshTraveler();

        post(trip.member, "/v1/itineraries/" + trip.id + "/invitations", """
                {"email":"someone@example.com"}
                """)
                .expectStatus()
                .isForbidden();

        archive(trip.owner, trip.id).expectStatus().isOk();

        patch(stranger, "/v1/itineraries/" + trip.id, VALID_ITINERARY_PATCH)
                .expectStatus()
                .isNotFound();

        masked(post(trip.member, "/v1/itineraries/" + trip.id + "/invitations", """
                {"email":"someone@example.com"}
                """));
    }


    @Test
    void unarchivingRestoresWritesForTheWholeRoster() {
        Trip trip = liveTripWithTwoMembers();
        archive(trip.owner, trip.id).expectStatus().isOk();
        unarchive(trip.owner, trip.id).expectStatus().isOk();

        acquireLease(trip.member, trip.id).expectStatus().isOk();
        patch(trip.member, "/v1/itineraries/" + trip.id, VALID_ITINERARY_PATCH).expectStatus().isOk();
    }



    private void refused(RestTestClient.ResponseSpec response) {
        response.expectStatus().isEqualTo(409).expectBody().jsonPath("$.code").isEqualTo("TRIP_ARCHIVED");
    }

    private void masked(RestTestClient.ResponseSpec response) {
        response.expectStatus().isNotFound().expectBody().jsonPath("$.code").isEqualTo("ITINERARY_NOT_FOUND");
    }

    private record Trip(
            String id,
            String owner,
            UUID ownerId,
            String member,
            UUID memberId,
            String pendingInvitationId,
            String pendingInvitationEmail) {}


    private Trip liveTripWithTwoMembers() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);
        String invitedEmail = "pending-" + UUID.randomUUID() + "@example.com";
        byte[] invitation =
                post(owner, "/v1/itineraries/" + tripId + "/invitations", "{\"email\":\"" + invitedEmail + "\"}")
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return new Trip(
                tripId,
                owner,
                travelerIdOf(owner),
                member,
                travelerIdOf(member),
                fieldIn(invitation, "id"),
                invitedEmail);
    }

    private RestTestClient.ResponseSpec archive(String token, String itineraryId) {
        return post(token, "/v1/itineraries/" + itineraryId + "/archive", null);
    }

    private RestTestClient.ResponseSpec unarchive(String token, String itineraryId) {
        return post(token, "/v1/itineraries/" + itineraryId + "/unarchive", null);
    }

    private RestTestClient.ResponseSpec acquireLease(String token, String itineraryId) {
        return post(token, "/v1/itineraries/" + itineraryId + "/edit-lock", null);
    }

    private RestTestClient.ResponseSpec post(String token, String uri, String body) {
        return body == null
                ? rest.post().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer(token)).exchange()
                : rest.post()
                        .uri(uri)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .exchange();
    }

    private RestTestClient.ResponseSpec patch(String token, String uri, String body) {
        return rest.method(HttpMethod.PATCH)
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    private RestTestClient.ResponseSpec put(String token, String uri, String body) {
        return rest.put()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    private RestTestClient.ResponseSpec delete(String token, String uri) {
        return rest.delete().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer(token)).exchange();
    }

    private UUID firstDayOf(String itineraryId) {
        return jdbc.queryForObject(
                "SELECT id FROM day WHERE itinerary_id = ? ORDER BY ordinal LIMIT 1",
                UUID.class,
                UUID.fromString(itineraryId));
    }

    private UUID createActivity(String token, String itineraryId, UUID dayId) {
        acquireLease(token, itineraryId).expectStatus().isOk();
        byte[] created =
                post(
                                token,
                                "/v1/itineraries/" + itineraryId + "/days/" + dayId + "/activities",
                                """
                                {"title":"Something to do"}
                                """)
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return UUID.fromString(fieldIn(created, "id"));
    }

    private int membershipCountOn(String itineraryId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM membership m JOIN workspace w ON w.id = m.workspace_id "
                        + "WHERE w.itinerary_id = ?",
                Integer.class,
                UUID.fromString(itineraryId));
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
                        {"title":"Fenceable trip","destinations":["Cebu"],"durationDays":2}
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
}
