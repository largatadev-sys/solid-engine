package com.largata.trip.web;

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
    void aMemberReadsTheTripThroughTheNewGrammarAndGetsTheOldWorldsTruth() {
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
                .jsonPath("$.viewerRole")
                .isEqualTo("member")
                .jsonPath("$.createdAt")
                .exists();
    }


    @Test
    void theOwnerReadsTheirOwnRole() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);

        rest.get()
                .uri("/v1/trips/" + trip)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.viewerRole")
                .isEqualTo("owner");
    }


    @Test
    void aNonMemberIsMaskedWithTheTripsOwnNotFound() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        String stranger = rig.travelerWithHandle(handle());

        rest.get()
                .uri("/v1/trips/" + trip)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("TRIP_NOT_FOUND");
    }


    @Test
    void anUnauthenticatedReadAnswersTheStandardRefusal() {
        rest.get()
                .uri("/v1/trips/" + UUID.randomUUID())
                .exchange()
                .expectStatus()
                .isUnauthorized()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("UNAUTHENTICATED");
    }


    @Test
    void anArchivedTripVanishesForTheMemberButNotTheOwner() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        String member = rig.joinAsMember(owner, trip, handle());
        rest.post()
                .uri("/v1/itineraries/" + trip + "/archive")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();

        rest.get()
                .uri("/v1/trips/" + trip)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(member))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("TRIP_NOT_FOUND");
        rest.get()
                .uri("/v1/trips/" + trip)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.archived")
                .isEqualTo(true);
    }


    private static String handle() {
        return "t" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }
}
