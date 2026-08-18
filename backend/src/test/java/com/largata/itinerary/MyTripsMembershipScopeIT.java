package com.largata.itinerary;

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
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class MyTripsMembershipScopeIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @Test
    void aJoinedTripAppearsInTheMembersOwnList() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());

        assertThat(myTripIds(memberToken)).containsExactly(trip);
    }

    @Test
    void ownedAndJoinedTripsShareOneList() {
        String travelerToken = verified(uniqueEmail());
        String theirOwnTrip = createTrip(travelerToken);
        String hostToken = verified(uniqueEmail());
        String hostedTrip = createTrip(hostToken);
        joinExistingTraveler(hostToken, hostedTrip, travelerToken);

        assertThat(myTripIds(travelerToken)).containsExactlyInAnyOrder(theirOwnTrip, hostedTrip);
        assertThat(myTripIds(hostToken)).containsExactly(hostedTrip);
    }

    @Test
    void aTravelerWithNoTripsGetsAnEmptyList() {
        assertThat(myTripIds(verified(uniqueEmail()))).isEmpty();
    }

    @Test
    void anExMemberLoosesTheTripFromTheirList() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());
        assertThat(myTripIds(memberToken)).containsExactly(trip);

        depart(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isNoContent();

        assertThat(myTripIds(memberToken)).isEmpty();
    }

    @Test
    void theFormerOwnerKeepsTheTripAfterTransferring() {
        String ownerToken = verified(uniqueEmail());
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip, uniqueEmail());
        offer(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isCreated();
        accept(memberToken, trip).expectStatus().isNoContent();

        assertThat(myTripIds(ownerToken)).as("the former owner is still a member").containsExactly(trip);
        assertThat(myTripIds(memberToken)).as("the new owner too").containsExactly(trip);
    }

    @Test
    void keysetPaginationWalksTheWholeMembershipScopedListExactlyOnce() {
        String travelerToken = verified(uniqueEmail());
        List<String> expected = new ArrayList<>();
        expected.add(createTrip(travelerToken));
        expected.add(createTrip(travelerToken));
        String hostToken = verified(uniqueEmail());
        for (int i = 0; i < 3; i++) {
            String hosted = createTrip(hostToken);
            joinExistingTraveler(hostToken, hosted, travelerToken);
            expected.add(hosted);
        }

        List<String> walked = new ArrayList<>();
        String cursor = null;
        int pages = 0;
        do {
            String uri = "/v1/itineraries?limit=2" + (cursor == null ? "" : "&cursor=" + cursor);
            byte[] body =
                    rest.get()
                            .uri(uri)
                            .header(HttpHeaders.AUTHORIZATION, bearer(travelerToken))
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

        assertThat(pages).as("five trips at two per page").isEqualTo(3);
        assertThat(walked).containsExactlyInAnyOrderElementsOf(expected).doesNotHaveDuplicates();
    }

    @Test
    void aMalformedCursorIsRejectedWhetherOrNotTheCallerHasAnyTrips() {
        String withTrips = verified(uniqueEmail());
        createTrip(withTrips);
        String withNone = verified(uniqueEmail());

        for (String token : List.of(withTrips, withNone)) {
            rest.get()
                    .uri("/v1/itineraries?cursor=not-a-real-cursor")
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
    void theListIsNewestFirstAcrossOwnedAndJoinedAlike() {
        String travelerToken = verified(uniqueEmail());
        String hostToken = verified(uniqueEmail());
        String first = createTrip(travelerToken);
        String second = createTrip(hostToken);
        joinExistingTraveler(hostToken, second, travelerToken);
        String third = createTrip(travelerToken);

        assertThat(myTripIds(travelerToken)).containsExactly(third, second, first);
    }


    private List<String> myTripIds(String token) {
        byte[] body =
                rest.get()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return idsIn(body);
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

    private RestTestClient.ResponseSpec depart(String callerToken, String tripId, UUID targetId) {
        return rest.method(HttpMethod.DELETE)
                .uri("/v1/itineraries/" + tripId + "/members/" + targetId)
                .header(HttpHeaders.AUTHORIZATION, bearer(callerToken))
                .exchange();
    }

    private String joinAsMember(String ownerToken, String tripId, String email) {
        String invitationId = invite(ownerToken, tripId, email);
        String memberToken = verified(email);
        acceptInvitation(memberToken, invitationId);
        return memberToken;
    }


    private void joinExistingTraveler(String hostToken, String tripId, String travelerToken) {
        String email = emailOf(travelerToken);
        acceptInvitation(travelerToken, invite(hostToken, tripId, email));
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

    private String createTrip(String token) {
        byte[] created =
                rest.post()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {"title":"Trip","destination":"Palawan"}
                                """)
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return fieldIn(created, "id");
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

    private static String uniqueEmail() {
        return "traveler-" + UUID.randomUUID() + "@example.com";
    }

    private static String verified(String email) {
        return TestJwtSupport.verifiedToken("uid-" + UUID.randomUUID(), email);
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private static String fieldIn(byte[] body, String field) {
        String json = new String(body);
        String needle = "\"" + field + "\":\"";
        int start = json.indexOf(needle) + needle.length();
        return json.substring(start, json.indexOf('"', start));
    }
}
