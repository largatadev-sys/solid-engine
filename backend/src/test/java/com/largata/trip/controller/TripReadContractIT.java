package com.largata.trip.controller;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class TripReadContractIT extends PostgresTestBase {

    private RestTestClient rest;
    private TripRig rig;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        rig = new TripRig(rest, jdbc);
    }


    @Test
    void theTripsGrammarAnswersTheFullRecordTheOldDetailAnswers() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 3);
        String member = rig.joinAsMember(owner, trip, handle());

        rest.get()
                .uri("/v1/trips/" + trip)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(member))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.id")
                .isEqualTo(trip)
                .jsonPath("$.title")
                .isEqualTo("Trip")
                .jsonPath("$.destination")
                .isEqualTo("Palawan")
                .jsonPath("$.state")
                .isEqualTo("upcoming")
                .jsonPath("$.published")
                .isEqualTo(false)
                .jsonPath("$.archived")
                .isEqualTo(false)
                .jsonPath("$.createdAt")
                .exists()
                .jsonPath("$.days")
                .isArray()
                .jsonPath("$.days.length()")
                .isEqualTo(3)
                .jsonPath("$.planVersion")
                .exists();
    }


    @Test
    void theDetailCarriesNoViewerRoleOnEitherRoot() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);

        for (String root : ROOTS) {
            rest.get()
                    .uri(root + trip)
                    .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                    .exchange()
                    .expectStatus()
                    .isOk()
                    .expectBody()
                    .jsonPath("$.viewerRole")
                    .doesNotExist();
        }
    }


    @Test
    void aNonMemberIsMaskedWithOneRefusalOnBothRoots() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        String stranger = rig.travelerWithHandle(handle());

        for (String root : ROOTS) {
            rest.get()
                    .uri(root + trip)
                    .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(stranger))
                    .exchange()
                    .expectStatus()
                    .isNotFound()
                    .expectBody()
                    .jsonPath("$.code")
                    .isEqualTo("ITINERARY_NOT_FOUND");
        }
    }


    @Test
    void anUnauthenticatedReadAnswersTheStandardRefusalOnBothRoots() {
        String id = UUID.randomUUID().toString();

        for (String root : ROOTS) {
            rest.get()
                    .uri(root + id)
                    .exchange()
                    .expectStatus()
                    .isUnauthorized()
                    .expectBody()
                    .jsonPath("$.code")
                    .isEqualTo("UNAUTHENTICATED");
        }
    }


    @Test
    void anArchivedTripVanishesForTheMemberButNotTheOwnerOnBothRoots() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        String member = rig.joinAsMember(owner, trip, handle());
        rest.post()
                .uri("/v1/trips/" + trip + "/archive")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();

        for (String root : ROOTS) {
            rest.get()
                    .uri(root + trip)
                    .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(member))
                    .exchange()
                    .expectStatus()
                    .isNotFound()
                    .expectBody()
                    .jsonPath("$.code")
                    .isEqualTo("ITINERARY_NOT_FOUND");
            rest.get()
                    .uri(root + trip)
                    .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                    .exchange()
                    .expectStatus()
                    .isOk()
                    .expectBody()
                    .jsonPath("$.archived")
                    .isEqualTo(true);
        }
    }


    private static final String[] ROOTS = {"/v1/itineraries/", "/v1/trips/"};

    private static String handle() {
        return "t" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }
}
