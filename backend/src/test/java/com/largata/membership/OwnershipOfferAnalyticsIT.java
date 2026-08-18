package com.largata.membership;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class OwnershipOfferAnalyticsIT extends PostgresTestBase {

    private RestTestClient rest;
    private ListAppender<ILoggingEvent> events;

    @LocalServerPort private int port;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        events = new ListAppender<>();
        events.start();
        analyticsLogger().addAppender(events);
    }

    @AfterEach
    void tearDown() {
        analyticsLogger().detachAppender(events);
    }

    @Test
    void offeringEmitsOfferCreatedNamingTheOwnerAsInitiator() {
        String ownerToken = verified();
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip);
        UUID ownerId = travelerIdOf(ownerToken);
        UUID memberId = travelerIdOf(memberToken);

        offer(ownerToken, trip, memberId).expectStatus().isCreated();

        assertThat(eventsNamed("ownership_offer_created"))
                .singleElement()
                .satisfies(
                        line ->
                                assertThat(line.getMDCPropertyMap())
                                        .containsEntry("event.itineraryId", trip)
                                        .containsEntry("event.travelerId", memberId.toString())
                                        .containsEntry("event.byTravelerId", ownerId.toString()));
    }

    @Test
    void revokingEmitsOfferRevokedNamingTheOwner() {
        String ownerToken = verified();
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip);
        UUID ownerId = travelerIdOf(ownerToken);
        offer(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isCreated();

        revoke(ownerToken, trip).expectStatus().isNoContent();

        assertThat(eventsNamed("ownership_offer_revoked"))
                .singleElement()
                .satisfies(
                        line ->
                                assertThat(line.getMDCPropertyMap())
                                        .containsEntry("event.byTravelerId", ownerId.toString()));
    }

    @Test
    void decliningEmitsOfferDeclinedNamingTheTargetAsInitiator() {
        String ownerToken = verified();
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip);
        UUID memberId = travelerIdOf(memberToken);
        offer(ownerToken, trip, memberId).expectStatus().isCreated();

        decline(memberToken, trip).expectStatus().isNoContent();

        assertThat(eventsNamed("ownership_offer_declined"))
                .singleElement()
                .satisfies(
                        line ->
                                assertThat(line.getMDCPropertyMap())
                                        .containsEntry("event.travelerId", memberId.toString())
                                        .containsEntry("event.byTravelerId", memberId.toString()));
    }

    @Test
    void aDepartureVoidsTheOfferAndAttributesItToWhoeverDroveTheDeparture() {
        String ownerToken = verified();
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip);
        UUID ownerId = travelerIdOf(ownerToken);
        UUID memberId = travelerIdOf(memberToken);
        offer(ownerToken, trip, memberId).expectStatus().isCreated();

        depart(ownerToken, trip, memberId).expectStatus().isNoContent();

        assertThat(eventsNamed("ownership_offer_voided"))
                .singleElement()
                .satisfies(
                        line ->
                                assertThat(line.getMDCPropertyMap())
                                        .containsEntry("event.travelerId", memberId.toString())
                                        .containsEntry("event.byTravelerId", ownerId.toString()));
        assertThat(eventsNamed("ownership_offer_revoked")).isEmpty();
    }

    @Test
    void aLeaverVoidingTheirOwnOfferIsAttributedToThem() {
        String ownerToken = verified();
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip);
        UUID memberId = travelerIdOf(memberToken);
        offer(ownerToken, trip, memberId).expectStatus().isCreated();

        depart(memberToken, trip, memberId).expectStatus().isNoContent();

        assertThat(eventsNamed("ownership_offer_voided"))
                .singleElement()
                .satisfies(
                        line ->
                                assertThat(line.getMDCPropertyMap())
                                        .containsEntry("event.byTravelerId", memberId.toString()));
    }

    @Test
    void acceptingEmitsExactlyOneTransferEventAndNoAcceptEvent() {
        String ownerToken = verified();
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip);
        UUID ownerId = travelerIdOf(ownerToken);
        UUID memberId = travelerIdOf(memberToken);
        offer(ownerToken, trip, memberId).expectStatus().isCreated();

        accept(memberToken, trip).expectStatus().isNoContent();

        assertThat(eventsNamed("ownership_transferred"))
                .singleElement()
                .satisfies(
                        line ->
                                assertThat(line.getMDCPropertyMap())
                                        .containsEntry("event.itineraryId", trip)
                                        .containsEntry("event.fromTravelerId", ownerId.toString())
                                        .containsEntry("event.toTravelerId", memberId.toString()));
        assertThat(eventsNamed("ownership_offer_accepted")).isEmpty();
    }

    @Test
    void refusedActsEmitNothing() {
        String ownerToken = verified();
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip);
        String otherToken = joinAsMember(ownerToken, trip);

        offer(memberToken, trip, travelerIdOf(otherToken)).expectStatus().isForbidden();
        offer(ownerToken, trip, travelerIdOf(verified())).expectStatus().isEqualTo(409);
        offer(ownerToken, trip, travelerIdOf(ownerToken)).expectStatus().isEqualTo(409);
        accept(memberToken, trip).expectStatus().isNotFound();
        decline(memberToken, trip).expectStatus().isNotFound();
        revoke(ownerToken, trip).expectStatus().isNoContent();

        assertThat(eventsNamed("ownership_offer_created")).isEmpty();
        assertThat(eventsNamed("ownership_offer_revoked")).isEmpty();
        assertThat(eventsNamed("ownership_offer_declined")).isEmpty();
        assertThat(eventsNamed("ownership_offer_voided")).isEmpty();
        assertThat(eventsNamed("ownership_transferred")).isEmpty();
    }

    @Test
    void theEventsNamePeopleByIdAndCarryNoEmailOrName() {
        String ownerToken = verified();
        String trip = createTrip(ownerToken);
        String memberEmail = "offeree-" + UUID.randomUUID() + "@example.com";
        String memberToken = joinAsMemberWithEmail(ownerToken, trip, memberEmail);
        offer(ownerToken, trip, travelerIdOf(memberToken)).expectStatus().isCreated();
        accept(memberToken, trip).expectStatus().isNoContent();

        assertThat(eventsNamed("ownership_offer_created"))
                .singleElement()
                .satisfies(line -> assertThat(line.getFormattedMessage()).doesNotContain(memberEmail));
        assertThat(eventsNamed("ownership_transferred"))
                .singleElement()
                .satisfies(line -> assertThat(line.getFormattedMessage()).doesNotContain(memberEmail));
    }


    private List<ILoggingEvent> eventsNamed(String eventName) {
        return events.list.stream()
                .filter(line -> line.getFormattedMessage().equals("event=" + eventName))
                .toList();
    }

    private RestTestClient.ResponseSpec offer(String callerToken, String tripId, UUID targetId) {
        return rest.post()
                .uri("/v1/itineraries/" + tripId + "/ownership-offer")
                .header(HttpHeaders.AUTHORIZATION, bearer(callerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"travelerId\":\"" + targetId + "\"}")
                .exchange();
    }

    private RestTestClient.ResponseSpec revoke(String callerToken, String tripId) {
        return rest.method(HttpMethod.DELETE)
                .uri("/v1/itineraries/" + tripId + "/ownership-offer")
                .header(HttpHeaders.AUTHORIZATION, bearer(callerToken))
                .exchange();
    }

    private RestTestClient.ResponseSpec accept(String callerToken, String tripId) {
        return rest.post()
                .uri("/v1/itineraries/" + tripId + "/ownership-offer/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(callerToken))
                .exchange();
    }

    private RestTestClient.ResponseSpec decline(String callerToken, String tripId) {
        return rest.post()
                .uri("/v1/itineraries/" + tripId + "/ownership-offer/decline")
                .header(HttpHeaders.AUTHORIZATION, bearer(callerToken))
                .exchange();
    }

    private RestTestClient.ResponseSpec depart(String callerToken, String tripId, UUID targetId) {
        return rest.method(HttpMethod.DELETE)
                .uri("/v1/itineraries/" + tripId + "/members/" + targetId)
                .header(HttpHeaders.AUTHORIZATION, bearer(callerToken))
                .exchange();
    }

    private String joinAsMember(String ownerToken, String tripId) {
        return joinAsMemberWithEmail(ownerToken, tripId, "traveler-" + UUID.randomUUID() + "@example.com");
    }

    private String joinAsMemberWithEmail(String ownerToken, String tripId, String email) {
        byte[] body =
                rest.post()
                        .uri("/v1/itineraries/" + tripId + "/invitations")
                        .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"email\":\"" + email + "\"}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        String memberToken = TestJwtSupport.verifiedToken("uid-" + UUID.randomUUID(), email);
        rest.post()
                .uri("/v1/invitations/" + fieldIn(body, "id") + "/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(memberToken))
                .exchange()
                .expectStatus()
                .isOk();
        return memberToken;
    }

    private String createTrip(String token) {
        byte[] created =
                rest.post()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {"title":"Trip","destination":"Palawan"}
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

    private static String verified() {
        return TestJwtSupport.verifiedToken(
                "uid-" + UUID.randomUUID(), "traveler-" + UUID.randomUUID() + "@example.com");
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

    private static Logger analyticsLogger() {
        return (Logger) LoggerFactory.getLogger("com.largata.analytics");
    }
}
