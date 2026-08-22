package com.largata.invitation.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.ShortHandles;
import com.largata.support.TestJwtSupport;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class InviteByHandleIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void aFoundersTwoCharacterHandleIsStillLookedUpAndInvited() {
        String owner = travelerWithHandle("owner" + suffix());
        String trip = createTrip(owner);
        String founder = travelerWithHandle("founder" + suffix());
        UUID founderId = travelerIdOf(founder);
        String twoCharacters = plantFounderHandle(founderId);

        rest.get()
                .uri("/v1/handles/" + twoCharacters)
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.handle")
                .isEqualTo(twoCharacters);

        rest.post()
                .uri("/v1/itineraries/" + trip + "/invitations/by-handle")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"" + twoCharacters + "\"}")
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.inviteeTravelerId")
                .isEqualTo(founderId.toString())
                .jsonPath("$.inviteeHandle")
                .isEqualTo(twoCharacters);
    }


    @Test
    void nobodyCanClaimATwoCharacterHandleForThemselves() {
        String uid = "uid-" + UUID.randomUUID();
        String token = TestJwtSupport.verifiedToken(uid, uid + "@example.com");

        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"ed\"}")
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("HANDLE_MALFORMED");
    }

    @Test
    void anExactHandleFindsTheTravelerAndAPartialOneFindsNothing() {
        String handle = "wanderer" + suffix();
        String traveler = travelerWithHandle(handle);
        UUID travelerId = travelerIdOf(traveler);
        String looker = travelerWithHandle("looker" + suffix());

        rest.get()
                .uri("/v1/handles/" + handle)
                .header(HttpHeaders.AUTHORIZATION, bearer(looker))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.id")
                .isEqualTo(travelerId.toString())
                .jsonPath("$.handle")
                .isEqualTo(handle);

        rest.get()
                .uri("/v1/handles/" + handle.substring(0, handle.length() - 1))
                .header(HttpHeaders.AUTHORIZATION, bearer(looker))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("TRAVELER_NOT_FOUND");
    }

    @Test
    void aLookupIsCaseInsensitiveAndCarriesNoEmail() {
        String handle = "mixedcase" + suffix();
        travelerWithHandle(handle);
        String looker = travelerWithHandle("looker" + suffix());

        rest.get()
                .uri("/v1/handles/" + handle.toUpperCase(java.util.Locale.ROOT))
                .header(HttpHeaders.AUTHORIZATION, bearer(looker))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.handle")
                .isEqualTo(handle)
                .jsonPath("$.email")
                .doesNotExist();
    }

    @Test
    void aLookupWithoutATokenIsRejectedAtTheSecurityChain() {
        rest.get().uri("/v1/handles/anybody").exchange().expectStatus().isUnauthorized();
    }

    @Test
    void anIdAddressedInvitationReachesTheInviteeWithoutAnyEmailMatch() {
        String ownerToken = travelerWithHandle("owner" + suffix());
        String tripId = createTrip(ownerToken);
        String inviteeHandle = "invitee" + suffix();
        String inviteeToken = travelerWithHandle(inviteeHandle);

        String invitationId = inviteByHandle(ownerToken, tripId, inviteeHandle);

        rest.get()
                .uri("/v1/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(inviteeToken))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items[0].id")
                .isEqualTo(invitationId)
                .jsonPath("$.items[0].itineraryId")
                .isEqualTo(tripId);
    }

    @Test
    void anIdAddressedInvitationIsInvisibleToEverybodyExceptItsInvitee() {
        String ownerToken = travelerWithHandle("owner" + suffix());
        String tripId = createTrip(ownerToken);
        String inviteeHandle = "invitee" + suffix();
        travelerWithHandle(inviteeHandle);
        String bystander = travelerWithHandle("bystander" + suffix());

        String invitationId = inviteByHandle(ownerToken, tripId, inviteeHandle);

        rest.get()
                .uri("/v1/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(bystander))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items.length()")
                .isEqualTo(0);

        rest.post()
                .uri("/v1/invitations/" + invitationId + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(bystander))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("INVITATION_NOT_FOUND");
    }

    @Test
    void anIdAddressedAcceptNeedsNoEmailMatchBecauseTheIdIsAlreadyExact() {
        String ownerToken = travelerWithHandle("owner" + suffix());
        String tripId = createTrip(ownerToken);
        String inviteeHandle = "invitee" + suffix();
        String inviteeToken = travelerWithHandle(inviteeHandle);

        String invitationId = inviteByHandle(ownerToken, tripId, inviteeHandle);

        rest.post()
                .uri("/v1/invitations/" + invitationId + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(inviteeToken))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.itineraryId")
                .isEqualTo(tripId);

        rest.get()
                .uri("/v1/itineraries/" + tripId)
                .header(HttpHeaders.AUTHORIZATION, bearer(inviteeToken))
                .exchange()
                .expectStatus()
                .isOk();
    }

    @Test
    void aSecondPendingInvitationToTheSameTravelerIsRefusedThroughEitherDoor() {
        String ownerToken = travelerWithHandle("owner" + suffix());
        String tripId = createTrip(ownerToken);
        String inviteeHandle = "invitee" + suffix();
        String inviteeEmail = emailOf(travelerWithHandle(inviteeHandle));

        inviteByHandle(ownerToken, tripId, inviteeHandle);

        rest.post()
                .uri("/v1/itineraries/" + tripId + "/invitations/by-handle")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"" + inviteeHandle + "\"}")
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("INVITATION_ALREADY_PENDING");

        rest.post()
                .uri("/v1/itineraries/" + tripId + "/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"email\":\"" + inviteeEmail + "\"}")
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("INVITATION_ALREADY_PENDING");
    }

    @Test
    void theHandleDoorNeverAsksWhatSomebodysEmailIs() {
        String ownerToken = travelerWithHandle("owner" + suffix());
        String tripId = createTrip(ownerToken);
        String inviteeHandle = "invitee" + suffix();
        String inviteeEmail = emailOf(travelerWithHandle(inviteeHandle));

        rest.post()
                .uri("/v1/itineraries/" + tripId + "/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"email\":\"" + inviteeEmail + "\"}")
                .exchange()
                .expectStatus()
                .isCreated();

        rest.post()
                .uri("/v1/itineraries/" + tripId + "/invitations/by-handle")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"" + inviteeHandle + "\"}")
                .exchange()
                .expectStatus()
                .isCreated();
    }

    @Test
    void thatSameTravelerCanOnlyEverJoinOnce() {
        String ownerToken = travelerWithHandle("owner" + suffix());
        String tripId = createTrip(ownerToken);
        String inviteeHandle = "invitee" + suffix();
        String inviteeToken = travelerWithHandle(inviteeHandle);
        String inviteeEmail = emailOf(inviteeToken);

        byte[] byEmail =
                rest.post()
                        .uri("/v1/itineraries/" + tripId + "/invitations")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"email\":\"" + inviteeEmail + "\"}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        String byHandle = inviteByHandle(ownerToken, tripId, inviteeHandle);

        acceptInvitation(inviteeToken, byHandle);

        rest.post()
                .uri("/v1/invitations/" + fieldIn(byEmail, "id") + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(inviteeToken))
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ALREADY_A_MEMBER");
    }

    @Test
    void invitingAnExistingMemberByHandleIsRefused() {
        String ownerToken = travelerWithHandle("owner" + suffix());
        String tripId = createTrip(ownerToken);
        String inviteeHandle = "invitee" + suffix();
        String inviteeToken = travelerWithHandle(inviteeHandle);
        acceptInvitation(inviteeToken, inviteByHandle(ownerToken, tripId, inviteeHandle));

        rest.post()
                .uri("/v1/itineraries/" + tripId + "/invitations/by-handle")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"" + inviteeHandle + "\"}")
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ALREADY_A_MEMBER");
    }

    @Test
    void invitingAnUnknownHandleIsANotFoundAndNotAnInvitation() {
        String ownerToken = travelerWithHandle("owner" + suffix());
        String tripId = createTrip(ownerToken);

        rest.post()
                .uri("/v1/itineraries/" + tripId + "/invitations/by-handle")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"nobodyhome" + suffix() + "\"}")
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("TRAVELER_NOT_FOUND");
    }

    @Test
    void aMemberWhoIsNotTheOwnerMayInviteByHandle() {
        String ownerToken = travelerWithHandle("owner" + suffix());
        String tripId = createTrip(ownerToken);
        String memberHandle = "member" + suffix();
        String memberToken = travelerWithHandle(memberHandle);
        acceptInvitation(memberToken, inviteByHandle(ownerToken, tripId, memberHandle));
        String outsider = travelerWithHandle("outsider" + suffix());
        String outsiderHandle = handleOf(outsider);

        rest.post()
                .uri("/v1/itineraries/" + tripId + "/invitations/by-handle")
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"" + outsiderHandle + "\"}")
                .exchange()
                .expectStatus()
                .isCreated();
    }

    @Test
    void thePendingListNamesTheHandleForAnIdAddressedInvitation() {
        String ownerToken = travelerWithHandle("owner" + suffix());
        String tripId = createTrip(ownerToken);
        String inviteeHandle = "invitee" + suffix();
        travelerWithHandle(inviteeHandle);

        inviteByHandle(ownerToken, tripId, inviteeHandle);

        rest.get()
                .uri("/v1/itineraries/" + tripId + "/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items[0].inviteeHandle")
                .isEqualTo(inviteeHandle)
                .jsonPath("$.items[0].email")
                .doesNotExist();
    }


    private String inviteByHandle(String ownerToken, String tripId, String handle) {
        byte[] created =
                rest.post()
                        .uri("/v1/itineraries/" + tripId + "/invitations/by-handle")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"handle\":\"" + handle + "\"}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return fieldIn(created, "id");
    }

    private void acceptInvitation(String token, String invitationId) {
        rest.post()
                .uri("/v1/invitations/" + invitationId + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }

    private String plantFounderHandle(UUID travelerId) {
        String handle = ShortHandles.mintUnclaimed(jdbc);
        jdbc.update("UPDATE traveler SET handle = ? WHERE id = ?", handle, travelerId);
        return handle;
    }


    private String travelerWithHandle(String handle) {
        String uid = "uid-" + UUID.randomUUID();
        String token = TestJwtSupport.verifiedToken(uid, uid + "@example.com");
        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"" + handle + "\"}")
                .exchange()
                .expectStatus()
                .isOk();
        return token;
    }

    private String createTrip(String token) {
        byte[] created =
                rest.post()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {"title":"Trip","destination":"Palawan","durationDays":1}
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

    private String handleOf(String token) {
        return fieldIn(me(token), "handle");
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

    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
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

    @Test
    void theInboxStillCarriesEmailAddressedInvitationsBesideIdAddressedOnes() {
        String ownerToken = travelerWithHandle("owner" + suffix());
        String tripA = createTrip(ownerToken);
        String tripB = createTrip(ownerToken);
        String inviteeHandle = "invitee" + suffix();
        String inviteeToken = travelerWithHandle(inviteeHandle);
        String inviteeEmail = emailOf(inviteeToken);

        inviteByHandle(ownerToken, tripA, inviteeHandle);
        rest.post()
                .uri("/v1/itineraries/" + tripB + "/invitations")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"email\":\"" + inviteeEmail + "\"}")
                .exchange()
                .expectStatus()
                .isCreated();

        byte[] inbox =
                rest.get()
                        .uri("/v1/invitations")
                        .header(HttpHeaders.AUTHORIZATION, bearer(inviteeToken))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();

        assertThat(new String(inbox))
                .as("both addressing modes land in one inbox")
                .contains(tripA)
                .contains(tripB);
    }
}
