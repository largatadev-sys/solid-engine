package com.largata.invitation;

import static com.largata.support.TripRig.bearer;
import static com.largata.support.TripRig.fieldIn;

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
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class AnyMemberInvitesContractIT extends PostgresTestBase {

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
    void aPlainMemberInvitesByHandleAndTheInvitationIsCreated() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        String trip = rig.createTrip(owner, 1);
        String member = rig.joinAsMember(owner, trip, uniqueHandle("member"));
        String outsiderHandle = uniqueHandle("outsider");
        rig.travelerWithHandle(outsiderHandle);

        inviteByHandle(member, trip, outsiderHandle).expectStatus().isCreated();
    }


    @Test
    void aPlainMemberInvitesByEmailToo() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        String trip = rig.createTrip(owner, 1);
        String member = rig.joinAsMember(owner, trip, uniqueHandle("member"));

        inviteByEmail(member, trip, uniqueEmail()).expectStatus().isCreated();
    }


    @Test
    void aPlainMemberRevokesAnInvitationSomebodyElseIssued() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        String trip = rig.createTrip(owner, 1);
        String member = rig.joinAsMember(owner, trip, uniqueHandle("member"));
        String invitationId = fieldIn(issuedByEmail(owner, trip, uniqueEmail()), "id");

        rest.post()
                .uri("/v1/invitations/" + invitationId + "/revoke")
                .header(HttpHeaders.AUTHORIZATION, bearer(member))
                .exchange()
                .expectStatus()
                .isNoContent();
    }


    @Test
    void theInvitationRecordsTheMemberWhoIssuedItSoAttributionSurvivesTheWidening() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        String trip = rig.createTrip(owner, 1);
        String memberHandle = uniqueHandle("member");
        String member = rig.joinAsMember(owner, trip, memberHandle);
        UUID memberId = rig.travelerIdOf(member);
        String inviteeHandle = uniqueHandle("invitee");
        String invitee = rig.travelerWithHandle(inviteeHandle);

        inviteByHandle(member, trip, inviteeHandle).expectStatus().isCreated();

        rest.get()
                .uri("/v1/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(invitee))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items[0].inviterName")
                .exists();

        String invitedBy =
                jdbc.queryForObject(
                        "SELECT invited_by::text FROM invitation WHERE invitee_traveler_id = ?",
                        String.class,
                        rig.travelerIdOf(invitee));
        org.assertj.core.api.Assertions.assertThat(invitedBy)
                .as("a non-owner's invitation still attributes to them, not to the owner")
                .isEqualTo(memberId.toString());
    }


    @Test
    void aStrangerStillCannotInviteAndIsMaskedAsANonMember() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        String trip = rig.createTrip(owner, 1);
        String stranger = rig.travelerWithHandle(uniqueHandle("stranger"));

        inviteByEmail(stranger, trip, uniqueEmail())
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ITINERARY_NOT_FOUND");
    }


    @Test
    void removalStaysOwnerOnlyEvenThoughInvitingWidened() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        String trip = rig.createTrip(owner, 1);
        String member = rig.joinAsMember(owner, trip, uniqueHandle("member"));
        String victim = rig.joinAsMember(owner, trip, uniqueHandle("victim"));

        rest.method(org.springframework.http.HttpMethod.DELETE)
                .uri("/v1/itineraries/" + trip + "/members/" + rig.travelerIdOf(victim))
                .header(HttpHeaders.AUTHORIZATION, bearer(member))
                .exchange()
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
    }


    @Test
    void offeringOwnershipStaysOwnerOnlyToo() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        String trip = rig.createTrip(owner, 1);
        String member = rig.joinAsMember(owner, trip, uniqueHandle("member"));
        String other = rig.joinAsMember(owner, trip, uniqueHandle("other"));

        rest.post()
                .uri("/v1/itineraries/" + trip + "/ownership-offer")
                .header(HttpHeaders.AUTHORIZATION, bearer(member))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"travelerId\":\"" + rig.travelerIdOf(other) + "\"}")
                .exchange()
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
    }


    private RestTestClient.ResponseSpec inviteByHandle(String token, String tripId, String handle) {
        return rest.post()
                .uri("/v1/itineraries/" + tripId + "/invitations/by-handle")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"" + handle + "\"}")
                .exchange();
    }

    private RestTestClient.ResponseSpec inviteByEmail(String token, String tripId, String email) {
        return rest.post()
                .uri("/v1/itineraries/" + tripId + "/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"email\":\"" + email + "\"}")
                .exchange();
    }

    private byte[] issuedByEmail(String token, String tripId, String email) {
        return inviteByEmail(token, tripId, email)
                .expectStatus()
                .isCreated()
                .expectBody()
                .returnResult()
                .getResponseBodyContent();
    }

    private static String uniqueHandle(String role) {
        return role + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private static String uniqueEmail() {
        return "invitee-" + UUID.randomUUID() + "@example.com";
    }
}
