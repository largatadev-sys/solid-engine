package com.largata.membership;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.sql.Timestamp;
import java.time.Instant;
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

/**
 * S1.9 ticket 02 over HTTP: archive and unarchive, their ladders, and everything that dissolves with
 * them (spec ACs 1, 2, 3, 6, 7).
 *
 * <p>The ladder is asserted in the order the service applies it — <strong>authority before state</strong>
 * (S1.5's rule, S1.7's precedent): a member who is not the owner is refused whether or not the
 * transition would have been legal, so a 403 never leaks where the trip sits in its lifecycle to
 * somebody without standing to move it.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class TripArchiveContractIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    // --- the happy path, both edges (spec ACs 1, 3) -----------------------------------------------

    @Test
    void theOwnerArchivesAndTheTripComesBackLiveOnUnarchive() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);

        assertThat(workspaceStateOf(tripId)).isEqualTo("ACTIVE");

        archive(owner, tripId).expectStatus().isOk().expectBody().jsonPath("$.archived").isEqualTo(true);
        assertThat(workspaceStateOf(tripId)).isEqualTo("ARCHIVED");

        unarchive(owner, tripId).expectStatus().isOk().expectBody().jsonPath("$.archived").isEqualTo(false);
        assertThat(workspaceStateOf(tripId)).isEqualTo("ACTIVE");
    }

    /**
     * <strong>Archive is legal from every itinerary state</strong> (spec AC 2, decision 8) — which
     * amends canon's original "skipping completed is illegal". A cancelled draft is archive's single
     * most likely real use, and a machine that could not express it would send owners to psql.
     */
    @Test
    void archiveIsLegalFromDraftActiveAndCompletedAlike() {
        String owner = freshTraveler();

        String draft = createItinerary(owner);
        String active = createItinerary(owner);
        start(owner, active).expectStatus().isOk();
        String completed = createItinerary(owner);
        start(owner, completed).expectStatus().isOk();
        complete(owner, completed).expectStatus().isOk();

        archive(owner, draft).expectStatus().isOk();
        archive(owner, active).expectStatus().isOk();
        archive(owner, completed).expectStatus().isOk();

        assertThat(workspaceStateOf(draft)).isEqualTo("ARCHIVED");
        assertThat(workspaceStateOf(active)).isEqualTo("ARCHIVED");
        assertThat(workspaceStateOf(completed)).isEqualTo("ARCHIVED");
    }

    /**
     * <strong>Unarchive recomputes the state rather than remembering it</strong> (spec AC 3, decision 8):
     * a completed trip comes back {@code COMPLETED}, everything else {@code ACTIVE}. No "previous state"
     * is stored, so there is nothing to drift while the trip sits archived.
     */
    @Test
    void unarchiveRestoresCompletedForACompletedTripAndActiveForEverythingElse() {
        String owner = freshTraveler();

        String completed = createItinerary(owner);
        start(owner, completed).expectStatus().isOk();
        complete(owner, completed).expectStatus().isOk();
        archive(owner, completed).expectStatus().isOk();
        unarchive(owner, completed).expectStatus().isOk();
        assertThat(workspaceStateOf(completed)).isEqualTo("COMPLETED");

        String draft = createItinerary(owner);
        archive(owner, draft).expectStatus().isOk();
        unarchive(owner, draft).expectStatus().isOk();
        assertThat(workspaceStateOf(draft)).isEqualTo("ACTIVE");
    }

    // --- the ladder (spec ACs 1, 3) ---------------------------------------------------------------

    @Test
    void archivingAnArchivedTripIsAConflictAndUnarchivingALiveOneIs() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);

        unarchive(owner, tripId)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ILLEGAL_STATE_TRANSITION");

        archive(owner, tripId).expectStatus().isOk();
        archive(owner, tripId)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ILLEGAL_STATE_TRANSITION");
    }

    @Test
    void aMemberWhoIsNotTheOwnerIsForbiddenFromBothEdges() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);

        archive(member, tripId)
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");

        archive(owner, tripId).expectStatus().isOk();
        unarchive(member, tripId)
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
    }

    /**
     * <strong>Authority before state, with a probe that can tell the two apart.</strong> The member here
     * asks for a transition that is <em>also</em> illegal (unarchiving a live trip), so the two checks
     * disagree about the answer: 403 means authority ran first, 409 would mean state did — and a 409
     * would tell a member without standing exactly where the trip sits. S1.7's {@code
     * authorityIsCheckedBeforeState} is the same test on the neighbouring machine.
     */
    @Test
    void authorityIsCheckedBeforeState() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);

        unarchive(member, tripId).expectStatus().isForbidden();
    }

    @Test
    void aNonMemberIsMaskedAndAnUnauthenticatedCallerIsRejected() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String stranger = freshTraveler();

        archive(stranger, tripId).expectStatus().isNotFound();
        unarchive(stranger, tripId).expectStatus().isNotFound();

        rest.post().uri("/v1/itineraries/" + tripId + "/archive").exchange().expectStatus().isUnauthorized();
        rest.post().uri("/v1/itineraries/" + tripId + "/unarchive").exchange().expectStatus().isUnauthorized();
    }

    // --- what dissolves with the trip (spec ACs 6, 7) ---------------------------------------------

    /**
     * The edit lease dies with the archive, and does not come back (spec AC 6, decision 12).
     *
     * <p>Without the release the plan stays locked for up to a TTL by somebody nobody can see, and the
     * others read "«X» is editing" on a trip nobody may edit. Unarchive deliberately does not restore it:
     * a lease is ephemeral concurrency control, and after an arbitrary gap the original holder's edit
     * screen is long gone.
     */
    @Test
    void archiveReleasesTheEditLeaseAndUnarchiveDoesNotBringItBack() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);

        acquireLease(member, tripId).expectStatus().isOk();
        assertThat(leaseCountOn(tripId)).as("the member holds a live lease").isEqualTo(1);

        archive(owner, tripId).expectStatus().isOk();
        assertThat(leaseCountOn(tripId)).as("archive frees the plan for everyone").isZero();

        unarchive(owner, tripId).expectStatus().isOk();
        assertThat(leaseCountOn(tripId)).as("a lease is not restored — whoever wants it acquires fresh").isZero();
    }

    /**
     * Pending invitations and a pending ownership offer both void, in the archive transaction, and
     * neither returns on unarchive (spec AC 7, decision 13).
     *
     * <p>{@code VOIDED} rather than {@code REVOKED} for both: the owner did not retract them, the system
     * dissolved them — and collapsing the two would permanently lose why a pending row ended.
     */
    @Test
    void archiveVoidsPendingInvitationsAndTheOwnershipOfferAndUnarchiveDoesNotRestoreThem() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        String member = admitMemberTo(tripId);

        invite(owner, tripId, "someone-" + UUID.randomUUID() + "@example.com").expectStatus().isCreated();
        offerOwnership(owner, tripId, travelerIdOf(member)).expectStatus().isCreated();

        assertThat(invitationStatusesOn(tripId)).containsExactly("PENDING");
        assertThat(offerStatusesOn(tripId)).containsExactly("PENDING");

        archive(owner, tripId).expectStatus().isOk();

        assertThat(invitationStatusesOn(tripId)).as("the system dissolved it, nobody revoked it").containsExactly("VOIDED");
        assertThat(offerStatusesOn(tripId)).containsExactly("VOIDED");

        unarchive(owner, tripId).expectStatus().isOk();

        assertThat(invitationStatusesOn(tripId)).as("unarchive restores the trip, not the moment").containsExactly("VOIDED");
        assertThat(offerStatusesOn(tripId)).containsExactly("VOIDED");
    }

    /**
     * <strong>Archive evicts nobody</strong> (spec AC 5's row-level half; the endpoint-level half is
     * ticket 03's enumeration test). Memberships survive untouched, so unarchiving yields a working trip
     * with the same roster rather than an empty one — which is the whole difference between archiving a
     * trip and dissolving it.
     */
    @Test
    void archiveLeavesEveryMembershipIntact() {
        String owner = freshTraveler();
        String tripId = createItinerary(owner);
        admitMemberTo(tripId);
        admitMemberTo(tripId);

        assertThat(membershipCountOn(tripId)).isEqualTo(3);

        archive(owner, tripId).expectStatus().isOk();
        assertThat(membershipCountOn(tripId)).as("nobody is kicked out by an archive").isEqualTo(3);

        unarchive(owner, tripId).expectStatus().isOk();
        assertThat(membershipCountOn(tripId)).isEqualTo(3);
    }

    // --- fixtures ---------------------------------------------------------------------------------

    private RestTestClient.ResponseSpec archive(String token, String itineraryId) {
        return post(token, "/v1/itineraries/" + itineraryId + "/archive");
    }

    private RestTestClient.ResponseSpec unarchive(String token, String itineraryId) {
        return post(token, "/v1/itineraries/" + itineraryId + "/unarchive");
    }

    private RestTestClient.ResponseSpec start(String token, String itineraryId) {
        return post(token, "/v1/itineraries/" + itineraryId + "/start");
    }

    private RestTestClient.ResponseSpec complete(String token, String itineraryId) {
        return post(token, "/v1/itineraries/" + itineraryId + "/complete");
    }

    private RestTestClient.ResponseSpec acquireLease(String token, String itineraryId) {
        return post(token, "/v1/itineraries/" + itineraryId + "/edit-lock");
    }

    private RestTestClient.ResponseSpec post(String token, String uri) {
        return rest.post().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer(token)).exchange();
    }

    private RestTestClient.ResponseSpec invite(String token, String itineraryId, String email) {
        return rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"email\":\"" + email + "\"}")
                .exchange();
    }

    private RestTestClient.ResponseSpec offerOwnership(String token, String itineraryId, UUID targetTravelerId) {
        return rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/ownership-offer")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"travelerId\":\"" + targetTravelerId + "\"}")
                .exchange();
    }

    /**
     * Reads the stored workspace state directly. Deliberately not through the API: the column's spelling
     * is a contract with Hibernate that no wire form exposes (the V4 lesson, pinned in
     * {@code WorkspaceStateStorageIT}).
     */
    private String workspaceStateOf(String itineraryId) {
        return jdbc.queryForObject(
                "SELECT state FROM workspace WHERE itinerary_id = ?", String.class, UUID.fromString(itineraryId));
    }

    private java.util.List<String> invitationStatusesOn(String itineraryId) {
        return jdbc.queryForList(
                "SELECT i.status FROM invitation i JOIN workspace w ON w.id = i.workspace_id "
                        + "WHERE w.itinerary_id = ?",
                String.class,
                UUID.fromString(itineraryId));
    }

    private java.util.List<String> offerStatusesOn(String itineraryId) {
        return jdbc.queryForList(
                "SELECT o.status FROM ownership_offer o JOIN workspace w ON w.id = o.workspace_id "
                        + "WHERE w.itinerary_id = ?",
                String.class,
                UUID.fromString(itineraryId));
    }

    private int leaseCountOn(String itineraryId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM edit_lease WHERE itinerary_id = ?",
                Integer.class,
                UUID.fromString(itineraryId));
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
                        {"title":"Archivable trip","destinations":["Cebu"]}
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
