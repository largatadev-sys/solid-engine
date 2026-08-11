package com.largata.itinerary.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class ProfileShowcaseIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void theShowcaseIsTheOwnedAndPublishedSet_andNothingElseTheTravelerCanSee() {
        String traveler = freshTraveler();
        String ownedPublished = publishedTrip(traveler);
        String ownedDraft = createTrip(traveler);

        String host = freshTraveler();
        String hostedPublished = publishedTrip(host);
        joinExistingTraveler(host, hostedPublished, traveler);

        assertThat(showcaseIds(traveler))
                .as("what the traveler published, of the trips they own")
                .containsExactly(ownedPublished)
                .doesNotContain(ownedDraft, hostedPublished);
    }


    @Test
    void theCountsMatchTheSameFixtureTheListingWasBuiltFrom() {
        String traveler = freshTraveler();
        publishedTrip(traveler);
        publishedTrip(traveler);
        createTrip(traveler);

        String host = freshTraveler();
        String hostedPublished = publishedTrip(host);
        joinExistingTraveler(host, hostedPublished, traveler);

        assertThat(publishedCount(traveler))
                .as("owned and published only — the draft and the hosted trip do not count")
                .isEqualTo(2);
        assertThat(tripCount(traveler))
                .as("every trip the traveler belongs to, owned or joined")
                .isEqualTo(4);
    }


    @Test
    void thePublishedCountAgreesWithTheListingItSitsAbove() {
        String traveler = freshTraveler();
        publishedTrip(traveler);
        publishedTrip(traveler);
        createTrip(traveler);

        assertThat(publishedCount(traveler)).isEqualTo(showcaseIds(traveler).size());
    }


    @Test
    void unpublishingTakesTheTripOutOfTheShowcaseAndOffTheCount() {
        String traveler = freshTraveler();
        String trip = publishedTrip(traveler);
        assertThat(showcaseIds(traveler)).containsExactly(trip);

        act(traveler, trip, "unpublish").expectStatus().isOk();

        assertThat(showcaseIds(traveler)).isEmpty();
        assertThat(publishedCount(traveler)).isZero();
        assertThat(tripCount(traveler)).as("it is still their trip, just not on show").isEqualTo(1);
    }


    @Test
    void theFormerOwnerLosesTheShowcaseCardTheNewOwnerGains() {
        String owner = freshTraveler();
        String trip = publishedTrip(owner);
        String member = joinAsMember(owner, trip, uniqueEmail());

        offer(owner, trip, travelerIdOf(member)).expectStatus().isCreated();
        accept(member, trip).expectStatus().isNoContent();

        assertThat(showcaseIds(owner)).as("no longer theirs to show").isEmpty();
        assertThat(showcaseIds(member)).as("the showcase follows ownership").containsExactly(trip);
        assertThat(tripCount(owner)).as("the former owner is still a member").isEqualTo(1);
    }


    @Test
    void anArchivedTripLeavesTheShowcaseAndBothCounts() {
        String traveler = freshTraveler();
        String trip = publishedTrip(traveler);

        act(traveler, trip, "archive").expectStatus().isOk();

        assertThat(showcaseIds(traveler)).isEmpty();
        assertThat(publishedCount(traveler)).isZero();
        assertThat(tripCount(traveler)).isZero();
    }


    @Test
    void aTravelerWithNothingPublishedGetsAnEmptyShowcaseAndZeroedCounts() {
        String traveler = freshTraveler();

        assertThat(showcaseIds(traveler)).isEmpty();
        assertThat(publishedCount(traveler)).isZero();
        assertThat(tripCount(traveler)).isZero();
    }


    @Test
    void aCardCarriesWhatTheProfileDraws() {
        String traveler = freshTraveler();
        String trip = publishedTrip(traveler);

        rest.get()
                .uri("/v1/me/profile/published")
                .header(HttpHeaders.AUTHORIZATION, bearer(traveler))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items[0].id")
                .isEqualTo(trip)
                .jsonPath("$.items[0].title")
                .isEqualTo("Trip")
                .jsonPath("$.items[0].destinations[0]")
                .isEqualTo("Palawan")
                .jsonPath("$.items[0].durationDays")
                .isEqualTo(3)
                .jsonPath("$.items[0].coverImageUrl")
                .doesNotExist();
    }


    @Test
    void keysetPaginationWalksTheShowcaseExactlyOnce() {
        String traveler = freshTraveler();
        List<String> expected = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            expected.add(publishedTrip(traveler));
        }

        List<String> walked = new ArrayList<>();
        String cursor = null;
        int pages = 0;
        do {
            String uri = "/v1/me/profile/published?limit=2" + (cursor == null ? "" : "&cursor=" + cursor);
            byte[] body =
                    rest.get()
                            .uri(uri)
                            .header(HttpHeaders.AUTHORIZATION, bearer(traveler))
                            .exchange()
                            .expectStatus()
                            .isOk()
                            .expectBody()
                            .returnResult()
                            .getResponseBodyContent();
            walked.addAll(idsIn(body));
            cursor = nextCursorIn(body);
            pages++;
        } while (cursor != null && pages < 10);

        assertThat(pages).as("five cards at two per page").isEqualTo(3);
        assertThat(walked).containsExactlyInAnyOrderElementsOf(expected).doesNotHaveDuplicates();
    }


    @Test
    void aMalformedCursorIsRejectedWhetherOrNotTheCallerHasPublishedAnything() {
        String withCards = freshTraveler();
        publishedTrip(withCards);
        String withNone = freshTraveler();

        for (String token : List.of(withCards, withNone)) {
            rest.get()
                    .uri("/v1/me/profile/published?cursor=not-a-real-cursor")
                    .header(HttpHeaders.AUTHORIZATION, bearer(token))
                    .exchange()
                    .expectStatus()
                    .isBadRequest()
                    .expectBody()
                    .jsonPath("$.code")
                    .isEqualTo("MALFORMED_CURSOR");
        }
    }


    @Test
    void bothProfileRoutesRefuseAnUnauthenticatedCaller() {
        for (String uri : List.of("/v1/me/profile/stats", "/v1/me/profile/published")) {
            rest.get().uri(uri).exchange().expectStatus().isUnauthorized();
        }
    }


    private List<String> showcaseIds(String token) {
        return idsIn(
                rest.get()
                        .uri("/v1/me/profile/published")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent());
    }

    private long publishedCount(String token) {
        return numberIn(stats(token), "publishedCount");
    }

    private long tripCount(String token) {
        return numberIn(stats(token), "tripCount");
    }

    private byte[] stats(String token) {
        return rest.get()
                .uri("/v1/me/profile/stats")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .returnResult()
                .getResponseBodyContent();
    }

    private String publishedTrip(String token) {
        String tripId = createTrip(token);
        act(token, tripId, "finish-planning").expectStatus().isOk();
        act(token, tripId, "start").expectStatus().isOk();
        act(token, tripId, "complete").expectStatus().isOk();
        act(token, tripId, "publish").expectStatus().isOk();
        return tripId;
    }

    private String createTrip(String token) {
        byte[] created =
                rest.post()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {"title":"Trip","destinations":["Palawan"],"durationDays":3}
                                """)
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return fieldIn(created, "id");
    }

    private RestTestClient.ResponseSpec act(String token, String tripId, String verb) {
        return rest.post()
                .uri("/v1/itineraries/" + tripId + "/" + verb)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }

    private RestTestClient.ResponseSpec offer(String callerToken, String tripId, UUID targetId) {
        return rest.post()
                .uri("/v1/itineraries/" + tripId + "/ownership-offer")
                .header(HttpHeaders.AUTHORIZATION, bearer(callerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"travelerId\":\"" + targetId + "\"}")
                .exchange();
    }

    private RestTestClient.ResponseSpec accept(String callerToken, String tripId) {
        return rest.post()
                .uri("/v1/itineraries/" + tripId + "/ownership-offer/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(callerToken))
                .exchange();
    }

    private String joinAsMember(String ownerToken, String tripId, String email) {
        String invitationId = invite(ownerToken, tripId, email);
        String memberToken = TestJwtSupport.verifiedToken("uid-" + UUID.randomUUID(), email);
        acceptInvitation(memberToken, invitationId);
        return memberToken;
    }

    private void joinExistingTraveler(String hostToken, String tripId, String travelerToken) {
        acceptInvitation(travelerToken, invite(hostToken, tripId, emailOf(travelerToken)));
    }

    private String invite(String ownerToken, String tripId, String email) {
        byte[] body =
                rest.post()
                        .uri("/v1/itineraries/" + tripId + "/invitations")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"email\":\"" + email + "\"}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return fieldIn(body, "id");
    }

    private void acceptInvitation(String token, String invitationId) {
        rest.post()
                .uri("/v1/invitations/" + invitationId + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }

    private UUID travelerIdOf(String token) {
        return UUID.fromString(fieldIn(me(token), "id"));
    }

    private String emailOf(String token) {
        return fieldIn(me(token), "email");
    }

    private byte[] me(String token) {
        return rest.get()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .returnResult()
                .getResponseBodyContent();
    }

    private static List<String> idsIn(byte[] body) {
        String json = new String(body);
        List<String> ids = new ArrayList<>();
        String needle = "\"id\":\"";
        int at = json.indexOf(needle);
        while (at >= 0) {
            int start = at + needle.length();
            ids.add(json.substring(start, json.indexOf('"', start)));
            at = json.indexOf(needle, start);
        }
        return ids;
    }

    private static String nextCursorIn(byte[] body) {
        String json = new String(body);
        String needle = "\"nextCursor\":\"";
        int at = json.indexOf(needle);
        if (at < 0) {
            return null;
        }
        int start = at + needle.length();
        return json.substring(start, json.indexOf('"', start));
    }

    private static long numberIn(byte[] body, String field) {
        String json = new String(body);
        String needle = "\"" + field + "\":";
        int start = json.indexOf(needle) + needle.length();
        int end = start;
        while (end < json.length() && Character.isDigit(json.charAt(end))) {
            end++;
        }
        return Long.parseLong(json.substring(start, end));
    }

    private static String fieldIn(byte[] body, String field) {
        String json = new String(body);
        String needle = "\"" + field + "\":\"";
        int start = json.indexOf(needle) + needle.length();
        return json.substring(start, json.indexOf('"', start));
    }

    private static String uniqueEmail() {
        return "traveler-" + UUID.randomUUID() + "@example.com";
    }

    private static String freshTraveler() {
        return TestJwtSupport.verifiedToken("uid-" + UUID.randomUUID(), uniqueEmail());
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
