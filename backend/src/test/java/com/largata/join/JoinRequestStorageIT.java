package com.largata.join;

import static com.largata.support.TripRig.bearer;
import static com.largata.support.TripRig.fieldIn;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class JoinRequestStorageIT extends PostgresTestBase {

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
    void aPendingRequestIsStoredWithTheUpperCaseNameThePartialIndexTests() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        String trip = rig.createTrip(owner, 1);
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        String token = joinTokenOf(owner, trip);

        rest.post()
                .uri("/v1/join/" + token + "/request")
                .header(HttpHeaders.AUTHORIZATION, bearer(asker))
                .exchange()
                .expectStatus()
                .isOk();

        String stored =
                jdbc.queryForObject(
                        "SELECT status FROM join_request WHERE traveler_id = ?",
                        String.class,
                        rig.travelerIdOf(asker));
        assertThat(stored)
                .as(
                        "V38's join_request_one_pending_idx has WHERE status = 'PENDING', so this asserts "
                                + "what HIBERNATE writes, not what a hand-written literal round-trips. If "
                                + "@Enumerated(STRING)'s spelling ever moved, the index would match nothing, "
                                + "create successfully and enforce nothing — the S1.1 `WHERE role = 'owner'` "
                                + "near-miss, which is the quietest possible failure")
                .isEqualTo("PENDING");
    }


    @Test
    void anApprovedRequestIsStoredWithItsOwnUpperCaseName() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        String trip = rig.createTrip(owner, 1);
        String asker = rig.travelerWithHandle(uniqueHandle("asker"));
        String token = joinTokenOf(owner, trip);
        rest.post()
                .uri("/v1/join/" + token + "/request")
                .header(HttpHeaders.AUTHORIZATION, bearer(asker))
                .exchange()
                .expectStatus()
                .isOk();
        String requestId =
                fieldIn(
                        rest.get()
                                .uri("/v1/itineraries/" + trip + "/join-requests")
                                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                                .exchange()
                                .expectStatus()
                                .isOk()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent(),
                        "id");

        rest.post()
                .uri("/v1/itineraries/" + trip + "/join-requests/" + requestId + "/approve")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .exchange()
                .expectStatus()
                .isNoContent();

        assertThat(
                        jdbc.queryForObject(
                                "SELECT status FROM join_request WHERE traveler_id = ?",
                                String.class,
                                rig.travelerIdOf(asker)))
                .isEqualTo("APPROVED");
    }


    @Test
    void twoPendingRequestsFromOneTravelerToOneTripAreRefusedByTheIndex() {
        UUID workspaceId = workspaceOfAFreshTrip();
        UUID travelerId = UUID.randomUUID();
        insertRequest(workspaceId, travelerId, "PENDING");

        assertThatThrownBy(() -> insertRequest(workspaceId, travelerId, "PENDING"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }


    @Test
    void aTerminalRowNeverBlocksAFreshAskSoDeclineStaysRetryable() {
        UUID workspaceId = workspaceOfAFreshTrip();
        UUID travelerId = UUID.randomUUID();
        insertRequest(workspaceId, travelerId, "DECLINED");
        insertRequest(workspaceId, travelerId, "SUPERSEDED");

        insertRequest(workspaceId, travelerId, "PENDING");

        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM join_request WHERE workspace_id = ? AND traveler_id = ?",
                                Integer.class,
                                workspaceId,
                                travelerId))
                .isEqualTo(3);
    }


    @Test
    void twoTravelersMayBothHaveAPendingAskOnOneTrip() {
        UUID workspaceId = workspaceOfAFreshTrip();

        insertRequest(workspaceId, UUID.randomUUID(), "PENDING");
        insertRequest(workspaceId, UUID.randomUUID(), "PENDING");

        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM join_request WHERE workspace_id = ? AND status = 'PENDING'",
                                Integer.class,
                                workspaceId))
                .as("unlike an ownership offer, many people may be asking one trip at once")
                .isEqualTo(2);
    }


    @Test
    void oneTripHasAtMostOneJoinLink() {
        UUID workspaceId = workspaceOfAFreshTrip();
        insertLink(workspaceId, "token-" + UUID.randomUUID());

        assertThatThrownBy(() -> insertLink(workspaceId, "token-" + UUID.randomUUID()))
                .as("one live link per trip is the decision, enforced by the schema rather than by hope")
                .isInstanceOf(DataIntegrityViolationException.class);
    }


    @Test
    void twoTripsCannotShareOneToken() {
        String token = "token-" + UUID.randomUUID();
        insertLink(workspaceOfAFreshTrip(), token);

        assertThatThrownBy(() -> insertLink(workspaceOfAFreshTrip(), token))
                .isInstanceOf(DataIntegrityViolationException.class);
    }


    @Test
    void aMintedTokenIsShortEnoughToShareAndLongEnoughToBeUnguessable() {
        String owner = rig.travelerWithHandle("owner" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        String trip = rig.createTrip(owner, 1);

        String token =
                fieldIn(
                        rest.get()
                                .uri("/v1/itineraries/" + trip + "/join-link")
                                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                                .exchange()
                                .expectStatus()
                                .isOk()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent(),
                        "token");

        assertThat(token.length() * 6)
                .as("ADR-032 amended 2026-08-23 to >=64 bits; url-safe base64 carries 6 bits a character")
                .isGreaterThanOrEqualTo(64);
        assertThat(token.length())
                .as("a link a traveler pastes into a chat; the founder called 43 characters too long")
                .isLessThanOrEqualTo(16);
        assertThat(token).matches("[A-Za-z0-9_-]+");
    }


    private String joinTokenOf(String ownerToken, String tripId) {
        return fieldIn(
                rest.get()
                        .uri("/v1/itineraries/" + tripId + "/join-link")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "token");
    }

    private static String uniqueHandle(String role) {
        return role + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private UUID workspaceOfAFreshTrip() {
        String owner = rig.travelerWithHandle("owner" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        String trip = rig.createTrip(owner, 1);
        return jdbc.queryForObject(
                "SELECT id FROM workspace WHERE itinerary_id = ?", UUID.class, UUID.fromString(trip));
    }

    private void insertRequest(UUID workspaceId, UUID travelerId, String status) {
        jdbc.update(
                "INSERT INTO join_request (id, workspace_id, traveler_id, status, created_at)"
                        + " VALUES (?, ?, ?, ?, ?)",
                UUID.randomUUID(),
                workspaceId,
                travelerId,
                status,
                OffsetDateTime.now(ZoneOffset.UTC));
    }

    private void insertLink(UUID workspaceId, String token) {
        jdbc.update(
                "INSERT INTO join_link (id, workspace_id, token, created_at) VALUES (?, ?, ?, ?)",
                UUID.randomUUID(),
                workspaceId,
                token,
                OffsetDateTime.now(ZoneOffset.UTC));
    }
}
