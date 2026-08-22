package com.largata.invitation.web;

import static com.largata.support.TripRig.bearer;
import static com.largata.support.TripRig.fieldIn;
import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
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
class InboxContextIT extends PostgresTestBase {

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
    void theInboxCardCarriesTheTripContextTheInviteeNeedsBeforeCommitting() {
        String ownerHandle = uniqueHandle("owner");
        String owner = rig.travelerWithHandle(ownerHandle);
        String trip = rig.createTrip(owner, 3);
        String inviteeHandle = uniqueHandle("invitee");
        String invitee = rig.travelerWithHandle(inviteeHandle);

        inviteByHandle(owner, trip, inviteeHandle).expectStatus().isCreated();

        inboxOf(invitee)
                .jsonPath("$.items[0].tripTitle")
                .isEqualTo("Trip")
                .jsonPath("$.items[0].destination")
                .isEqualTo("Palawan")
                .jsonPath("$.items[0].inviterHandle")
                .isEqualTo(ownerHandle)
                .jsonPath("$.items[0].travelerCount")
                .isEqualTo(1)
                .jsonPath("$.items[0].expiresAt")
                .exists();
    }


    @Test
    void theGoingPreviewNamesWhoIsAlreadyOnTheTrip() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        String trip = rig.createTrip(owner, 1);
        rig.joinAsMember(owner, trip, uniqueHandle("member"));
        String inviteeHandle = uniqueHandle("invitee");
        String invitee = rig.travelerWithHandle(inviteeHandle);

        inviteByHandle(owner, trip, inviteeHandle).expectStatus().isCreated();

        inboxOf(invitee)
                .jsonPath("$.items[0].going.length()")
                .isEqualTo(2)
                .jsonPath("$.items[0].travelerCount")
                .isEqualTo(2);
    }


    @Test
    void theGoingPreviewIsCappedSoAHugeTripDoesNotShipItsWholeRoster() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        String trip = rig.createTrip(owner, 1);
        rig.joinAsMember(owner, trip, uniqueHandle("m1"));
        rig.joinAsMember(owner, trip, uniqueHandle("m2"));
        rig.joinAsMember(owner, trip, uniqueHandle("m3"));
        String inviteeHandle = uniqueHandle("invitee");
        String invitee = rig.travelerWithHandle(inviteeHandle);

        inviteByHandle(owner, trip, inviteeHandle).expectStatus().isCreated();

        inboxOf(invitee)
                .jsonPath("$.items[0].going.length()")
                .isEqualTo(3)
                .jsonPath("$.items[0].travelerCount")
                .isEqualTo(4);
    }


    @Test
    void anExpiredInvitationRendersNowhereOnEitherSide() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        String trip = rig.createTrip(owner, 1);
        String inviteeHandle = uniqueHandle("invitee");
        String invitee = rig.travelerWithHandle(inviteeHandle);
        String invitationId =
                fieldIn(
                        inviteByHandle(owner, trip, inviteeHandle)
                                .expectStatus()
                                .isCreated()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent(),
                        "id");

        expire(invitationId);

        inboxOf(invitee).jsonPath("$.items.length()").isEqualTo(0);
        pendingOf(owner, trip).jsonPath("$.items.length()").isEqualTo(0);
    }


    @Test
    void reInvitingAfterExpiryMintsAFreshRowThatBothListsShow() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        String trip = rig.createTrip(owner, 1);
        String inviteeHandle = uniqueHandle("invitee");
        String invitee = rig.travelerWithHandle(inviteeHandle);
        String first =
                fieldIn(
                        inviteByHandle(owner, trip, inviteeHandle)
                                .expectStatus()
                                .isCreated()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent(),
                        "id");
        expire(first);

        String second =
                fieldIn(
                        inviteByHandle(owner, trip, inviteeHandle)
                                .expectStatus()
                                .isCreated()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent(),
                        "id");

        assertThat(second).isNotEqualTo(first);
        inboxOf(invitee).jsonPath("$.items.length()").isEqualTo(1);
        pendingOf(owner, trip).jsonPath("$.items.length()").isEqualTo(1);
    }


    @Test
    void thePendingListNamesTheInviterAndFlagsTheEmailLegacyRow() {
        String ownerHandle = uniqueHandle("owner");
        String owner = rig.travelerWithHandle(ownerHandle);
        String trip = rig.createTrip(owner, 1);
        String inviteeHandle = uniqueHandle("invitee");
        rig.travelerWithHandle(inviteeHandle);

        inviteByHandle(owner, trip, inviteeHandle).expectStatus().isCreated();
        inviteByEmail(owner, trip, "legacy-" + UUID.randomUUID() + "@example.com").expectStatus().isCreated();

        pendingOf(owner, trip)
                .jsonPath("$.items[?(@.emailLegacy == false)].inviteeHandle")
                .isEqualTo(inviteeHandle)
                .jsonPath("$.items[0].inviterHandle")
                .isEqualTo(ownerHandle);
    }


    @Test
    void theEmailLegacyRowIsRecognizableWithoutTheClientEverNeedingTheAddress() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        String trip = rig.createTrip(owner, 1);
        inviteByEmail(owner, trip, "legacy-" + UUID.randomUUID() + "@example.com").expectStatus().isCreated();

        pendingOf(owner, trip)
                .jsonPath("$.items[0].emailLegacy")
                .isEqualTo(true)
                .jsonPath("$.items[0].inviteeTravelerId")
                .isEmpty();
    }


    @Test
    void theInviteesInboxNeverCarriesAnAddressAtAll() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        String trip = rig.createTrip(owner, 1);
        String inviteeHandle = uniqueHandle("invitee");
        String invitee = rig.travelerWithHandle(inviteeHandle);
        inviteByHandle(owner, trip, inviteeHandle).expectStatus().isCreated();

        String body =
                new String(
                        rest.get()
                                .uri("/v1/invitations")
                                .header(HttpHeaders.AUTHORIZATION, bearer(invitee))
                                .exchange()
                                .expectStatus()
                                .isOk()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent());

        assertThat(body)
                .as("the card renders no address, so the inbox payload has no reason to carry one")
                .doesNotContain("@example.com");
    }


    @Test
    void theInviteeMayReadTheCoverTheAudienceFenceWouldRefuseThem() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        String trip = rig.createTrip(owner, 1);
        String inviteeHandle = uniqueHandle("invitee");
        String invitee = rig.travelerWithHandle(inviteeHandle);
        String invitationId =
                fieldIn(
                        inviteByHandle(owner, trip, inviteeHandle)
                                .expectStatus()
                                .isCreated()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent(),
                        "id");

        rest.get()
                .uri("/v1/invitations/" + invitationId + "/cover")
                .header(HttpHeaders.AUTHORIZATION, bearer(invitee))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("PHOTO_NOT_FOUND");
    }


    @Test
    void somebodyElsesInvitationCoverIsNotReadable() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        String trip = rig.createTrip(owner, 1);
        String inviteeHandle = uniqueHandle("invitee");
        rig.travelerWithHandle(inviteeHandle);
        String stranger = rig.travelerWithHandle(uniqueHandle("stranger"));
        String invitationId =
                fieldIn(
                        inviteByHandle(owner, trip, inviteeHandle)
                                .expectStatus()
                                .isCreated()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent(),
                        "id");

        rest.get()
                .uri("/v1/invitations/" + invitationId + "/cover")
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("INVITATION_NOT_FOUND");
    }


    @Test
    void anExpiredInvitationStopsAuthorizingItsCover() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        String trip = rig.createTrip(owner, 1);
        String inviteeHandle = uniqueHandle("invitee");
        String invitee = rig.travelerWithHandle(inviteeHandle);
        String invitationId =
                fieldIn(
                        inviteByHandle(owner, trip, inviteeHandle)
                                .expectStatus()
                                .isCreated()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent(),
                        "id");
        expire(invitationId);

        rest.get()
                .uri("/v1/invitations/" + invitationId + "/cover")
                .header(HttpHeaders.AUTHORIZATION, bearer(invitee))
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("INVITATION_EXPIRED");
    }


    private void expire(String invitationId) {
        jdbc.update(
                "UPDATE invitation SET expires_at = ? WHERE id = ?",
                OffsetDateTime.ofInstant(Instant.now().minusSeconds(3600), ZoneOffset.UTC),
                UUID.fromString(invitationId));
    }

    private RestTestClient.BodyContentSpec inboxOf(String token) {
        return rest.get()
                .uri("/v1/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody();
    }

    private RestTestClient.BodyContentSpec pendingOf(String token, String tripId) {
        return rest.get()
                .uri("/v1/itineraries/" + tripId + "/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody();
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

    private static String uniqueHandle(String role) {
        return role + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
