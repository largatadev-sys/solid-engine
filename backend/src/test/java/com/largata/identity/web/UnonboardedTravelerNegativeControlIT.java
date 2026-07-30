package com.largata.identity.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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
class UnonboardedTravelerNegativeControlIT extends PostgresTestBase {

    private RestTestClient rest;
    private String token;
    private String uid;

    @LocalServerPort private int port;
    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        uid = "uid-" + UUID.randomUUID();
        token = TestJwtSupport.verifiedToken(uid, uid + "@example.com");
    }

    @Test
    void theCoreSurfaceServesATravelerWhoHasNeverOnboarded() {
        rest.get()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer())
                .exchange()
                .expectStatus()
                .isOk();

        String itineraryId = createItinerary();

        rest.get()
                .uri("/v1/itineraries")
                .header(HttpHeaders.AUTHORIZATION, bearer())
                .exchange()
                .expectStatus()
                .isOk();

        rest.get()
                .uri("/v1/itineraries/" + itineraryId)
                .header(HttpHeaders.AUTHORIZATION, bearer())
                .exchange()
                .expectStatus()
                .isOk();

        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/edit-lock")
                .header(HttpHeaders.AUTHORIZATION, bearer())
                .exchange()
                .expectStatus()
                .isOk();

        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/days")
                .header(HttpHeaders.AUTHORIZATION, bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"title\":\"Arrival\"}")
                .exchange()
                .expectStatus()
                .isCreated();

        rest.get()
                .uri("/v1/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer())
                .exchange()
                .expectStatus()
                .isOk();

        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"email\":\"guest-" + UUID.randomUUID() + "@example.com\"}")
                .exchange()
                .expectStatus()
                .isCreated();

        assertThat(profileIsStillEmpty())
                .as("the whole point of the control: none of the above needed a handle or a "
                        + "completion marker, and none of them quietly created one")
                .isTrue();
    }

    private String createItinerary() {
        byte[] body =
                rest.post()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"title\":\"Unonboarded trip\",\"destinations\":[\"Lisbon\"]}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        String json = new String(body);
        int start = json.indexOf("\"id\":\"") + "\"id\":\"".length();
        return json.substring(start, json.indexOf('"', start));
    }

    private boolean profileIsStillEmpty() {
        return Boolean.TRUE.equals(
                jdbc.queryForObject(
                        "SELECT handle IS NULL AND onboarding_completed_at IS NULL FROM traveler "
                                + "WHERE firebase_uid = ?",
                        Boolean.class,
                        uid));
    }

    private String bearer() {
        return "Bearer " + token;
    }
}
