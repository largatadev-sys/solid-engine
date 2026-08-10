package com.largata.invitation.web;

import static org.assertj.core.api.Assertions.assertThat;

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
class RosterProfileFieldsIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void theRosterCarriesHandleBioAndVanityNumberForEveryMember() {
        String ownerHandle = uniqueHandle();
        String memberHandle = uniqueHandle();
        String guestEmail = uniqueGuest();
        String owner = verifiedNamed("owner@example.com", "Ana Silva");
        describe(owner, ownerHandle, "Walks slowly, photographs everything.");
        String member = verifiedNamed(guestEmail, "Beto Cruz");
        describe(member, memberHandle, "Always finds the good coffee.");

        String itinerary = createItinerary(owner);
        accept(member, invite(owner, itinerary, guestEmail));

        rest.get()
                .uri("/v1/itineraries/" + itinerary + "/members")
                .header(HttpHeaders.AUTHORIZATION, bearer(member))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items[0].handle")
                .isEqualTo(ownerHandle)
                .jsonPath("$.items[0].bio")
                .isEqualTo("Walks slowly, photographs everything.")
                .jsonPath("$.items[0].vanityNumber")
                .value(number -> assertThat((String) number).matches("01\\d{4}"))
                .jsonPath("$.items[1].handle")
                .isEqualTo(memberHandle)
                .jsonPath("$.items[1].bio")
                .isEqualTo("Always finds the good coffee.")
                .jsonPath("$.items[1].vanityNumber")
                .value(number -> assertThat((String) number).matches("01\\d{4}"));
    }

    @Test
    void aMemberWhoSetNoHandleOrBioIsServedNullsRatherThanOmittedFields() {
        String owner = verifiedNamed("owner@example.com", "Ana Silva");
        String itinerary = createItinerary(owner);

        rest.get()
                .uri("/v1/itineraries/" + itinerary + "/members")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items[0].handle")
                .isEmpty()
                .jsonPath("$.items[0].bio")
                .isEmpty()
                .jsonPath("$.items[0].vanityNumber")
                .value(number -> assertThat((String) number).matches("01\\d{4}"));
    }

    @Test
    void theFieldsRideTheExistingResponseWithoutDisturbingIt() {
        String owner = verifiedNamed("owner@example.com", "Ana Silva");
        describe(owner, uniqueHandle(), "Walks slowly.");
        String itinerary = createItinerary(owner);

        rest.get()
                .uri("/v1/itineraries/" + itinerary + "/members")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items[0].travelerId")
                .exists()
                .jsonPath("$.items[0].displayName")
                .isEqualTo("Ana Silva")
                .jsonPath("$.items[0].role")
                .isEqualTo("owner")
                .jsonPath("$.items[0].joinedAt")
                .exists()
                .jsonPath("$.items[0].ownershipOffered")
                .isEqualTo(false);
    }

    @Test
    void aNonMemberIsStillRefusedAndLearnsNoProfileFields() {
        String owner = verifiedNamed("owner@example.com", "Ana Silva");
        describe(owner, uniqueHandle(), "Walks slowly.");
        String itinerary = createItinerary(owner);

        rest.get()
                .uri("/v1/itineraries/" + itinerary + "/members")
                .header(HttpHeaders.AUTHORIZATION, bearer(verified("stranger@example.com")))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ITINERARY_NOT_FOUND")
                .jsonPath("$.handle")
                .doesNotExist()
                .jsonPath("$.bio")
                .doesNotExist()
                .jsonPath("$.vanityNumber")
                .doesNotExist();
    }


    private void describe(String token, String handle, String bio) {
        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"" + handle + "\",\"bio\":\"" + bio + "\"}")
                .exchange()
                .expectStatus()
                .isOk();
    }

    private String invite(String ownerToken, String itineraryId, String email) {
        byte[] body =
                rest.post()
                        .uri("/v1/itineraries/" + itineraryId + "/invitations")
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

    private void accept(String token, String invitationId) {
        rest.post()
                .uri("/v1/invitations/" + invitationId + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }

    private String createItinerary(String token) {
        byte[] created =
                rest.post()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"title\":\"A trip\",\"destinations\":[\"Lisbon\"]}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return fieldIn(created, "id");
    }


    private static String uniqueHandle() {
        return "t" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private static String uniqueGuest() {
        return "guest-" + UUID.randomUUID() + "@example.com";
    }

    private static String verified(String email) {
        return TestJwtSupport.verifiedToken("uid-" + UUID.randomUUID(), email);
    }

    private static String verifiedNamed(String email, String name) {
        return TestJwtSupport.verifiedTokenWithName("uid-" + UUID.randomUUID(), email, name);
    }

    private static String fieldIn(byte[] body, String field) {
        String json = new String(body);
        String needle = "\"" + field + "\":\"";
        int start = json.indexOf(needle) + needle.length();
        return json.substring(start, json.indexOf('"', start));
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
