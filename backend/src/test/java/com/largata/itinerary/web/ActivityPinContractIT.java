package com.largata.itinerary.web;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
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
class ActivityPinContractIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void aPinnedActivityRoundTripsThePointAndTheZoomItWasDroppedAt() {
        Trip trip = aTripWithADay();

        create(trip, "{\"title\":\"Kayak\",\"place\":\"Big Lagoon\","
                        + "\"pin\":{\"lat\":11.1949,\"lng\":119.4013,\"zoom\":15}}")
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.pin.lat")
                .isEqualTo(11.194900)
                .jsonPath("$.pin.lng")
                .isEqualTo(119.401300)
                .jsonPath("$.pin.zoom")
                .isEqualTo(15);
    }


    @Test
    void anActivityWithoutAPinCarriesAnExplicitNull_soAbsenceIsReadableRatherThanMissing() {
        Trip trip = aTripWithADay();

        create(trip, "{\"title\":\"Wander\",\"place\":\"Somewhere typed\"}")
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.pin")
                .isEmpty();
    }


    @Test
    void aPinWithoutAPlaceIsRefused_becauseADayCardMustNeverShowALocationNobodyCanRead() {
        Trip trip = aTripWithADay();

        create(trip, "{\"title\":\"Kayak\",\"pin\":{\"lat\":11.1949,\"lng\":119.4013,\"zoom\":15}}")
                .expectStatus()
                .isBadRequest();
    }


    @Test
    void aPinOffTheEarthIsRefusedWithAFourHundredRatherThanAFiveHundred() {
        Trip trip = aTripWithADay();

        create(trip, "{\"title\":\"Nowhere\",\"place\":\"Nowhere\","
                        + "\"pin\":{\"lat\":999,\"lng\":0,\"zoom\":15}}")
                .expectStatus()
                .isBadRequest();
    }


    @Test
    void aZoomTheTileProviderDoesNotServeIsRefusedWithAFourHundred() {
        Trip trip = aTripWithADay();

        create(trip, "{\"title\":\"Too close\",\"place\":\"Too close\","
                        + "\"pin\":{\"lat\":11.1949,\"lng\":119.4013,\"zoom\":99}}")
                .expectStatus()
                .isBadRequest();
    }


    @Test
    void halfAPinIsRefused_becauseTheWireShapeMakesItInexpressibleAndSoDoesTheServer() {
        Trip trip = aTripWithADay();

        create(trip, "{\"title\":\"Half\",\"place\":\"Half\",\"pin\":{\"lat\":11.1949,\"zoom\":15}}")
                .expectStatus()
                .isBadRequest();
    }


    @Test
    void theDestinationPinRoundTripsThroughCreateAndIsClearedByAnExplicitNull() {
        String owner = freshTraveler();

        String tripId =
                idIn(
                        rest.post()
                                .uri("/v1/itineraries")
                                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                                .contentType(MediaType.APPLICATION_JSON)
                                .body("{\"title\":\"Pinned trip\",\"destination\":\"El Nido\",\"durationDays\":1,"
                                        + "\"pin\":{\"lat\":11.18,\"lng\":119.39,\"zoom\":12}}")
                                .exchange()
                                .expectStatus()
                                .isCreated()
                                .expectBody()
                                .jsonPath("$.pin.zoom")
                                .isEqualTo(12)
                                .returnResult()
                                .getResponseBody());

        lock(owner, tripId);

        rest.method(org.springframework.http.HttpMethod.PATCH)
                .uri("/v1/itineraries/" + tripId)
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"title\":\"Pinned trip\",\"destination\":\"El Nido\",\"pin\":null}")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.pin")
                .isEmpty();
    }


    @Test
    void anUpdateRefusesABadPinTheSameWayACreateDoes_oneInputShapeOneErrorContract() {
        String owner = freshTraveler();

        String tripId =
                idIn(
                        rest.post()
                                .uri("/v1/itineraries")
                                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                                .contentType(MediaType.APPLICATION_JSON)
                                .body("{\"title\":\"Trip\",\"destination\":\"El Nido\",\"durationDays\":1}")
                                .exchange()
                                .expectStatus()
                                .isCreated()
                                .expectBody()
                                .returnResult()
                                .getResponseBody());

        lock(owner, tripId);

        rest.method(org.springframework.http.HttpMethod.PATCH)
                .uri("/v1/itineraries/" + tripId)
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"title\":\"Trip\",\"destination\":\"El Nido\","
                        + "\"pin\":{\"lat\":999,\"lng\":0,\"zoom\":12}}")
                .exchange()
                .expectStatus()
                .isBadRequest();
    }


    private RestTestClient.ResponseSpec create(Trip trip, String body) {
        return rest.post()
                .uri("/v1/itineraries/" + trip.id() + "/days/" + trip.dayId() + "/activities")
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.ownerToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }


    private Trip aTripWithADay() {
        String owner = freshTraveler();

        String created =
                new String(
                        rest.post()
                                .uri("/v1/itineraries")
                                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                                .contentType(MediaType.APPLICATION_JSON)
                                .body("{\"title\":\"Pins\",\"destination\":\"El Nido\",\"durationDays\":1}")
                                .exchange()
                                .expectStatus()
                                .isCreated()
                                .expectBody()
                                .returnResult()
                                .getResponseBody());

        String tripId = firstIdAfter(created, 0);
        int days = created.indexOf("\"days\"");

        return new Trip(tripId, UUID.fromString(firstIdAfter(created, days)), owner);
    }


    private void lock(String token, String tripId) {
        rest.post()
                .uri("/v1/itineraries/" + tripId + "/edit-lock")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private String freshTraveler() {
        String uid = "uid-" + UUID.randomUUID();
        String token = TestJwtSupport.tokenFor(uid, uid + "@largata.example");
        rest.get().uri("/v1/me").header(HttpHeaders.AUTHORIZATION, bearer(token)).exchange();
        return token;
    }


    private static String idIn(byte[] body) {
        return firstIdAfter(new String(body), 0);
    }


    private static String firstIdAfter(String json, int from) {
        int at = json.indexOf("\"id\":\"", from) + 6;
        return json.substring(at, json.indexOf('"', at));
    }


    private static String bearer(String token) {
        return "Bearer " + token;
    }


    private record Trip(String id, UUID dayId, String ownerToken) {
    }
}
