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

/**
 * Spec AC 10 for S1.6: one event per act, the true initiator on each, and nothing at all when an act
 * is refused or rolled back.
 *
 * <p><strong>The distinctions these assertions defend are the reason the status enum has five values.</strong>
 * {@code _revoked} is the owner retracting, {@code _declined} the target refusing, {@code _voided} the
 * system dissolving the offer because the target left — three different people (or none) acting. Collapse
 * them and the funnel can no longer tell "owners keep changing their minds" from "nobody wants the
 * crown" from "people are leaving trips", which are three unrelated product signals.
 *
 * <p>And {@code ownership_transferred} stands alone at accept: there is deliberately no {@code
 * offer_accepted}, because accept <em>is</em> the transfer and two events would double-count one
 * movement of ownership in every funnel that reads them (the S1.5 one-act-one-event discipline).
 */
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
        // The target acted, so the target is the initiator — not the owner whose offer it was.
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
        // The owner removed the offeree: the void is attributed to the owner, but as a *void*, never as
        // a revoke — the owner retracted nothing, they removed a person and the offer died with them.
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
        // One act, one event: no offer_accepted alongside it.
        assertThat(eventsNamed("ownership_offer_accepted")).isEmpty();
    }

    @Test
    void refusedActsEmitNothing() {
        // Every rejection rolls back, and a funnel that counted rejections as offers would report
        // ownership movement that never happened (the S1.5 rolled-back-departure reasoning).
        String ownerToken = verified();
        String trip = createTrip(ownerToken);
        String memberToken = joinAsMember(ownerToken, trip);
        String otherToken = joinAsMember(ownerToken, trip);

        // A member cannot offer.
        offer(memberToken, trip, travelerIdOf(otherToken)).expectStatus().isForbidden();
        // Nor can the owner offer to a stranger, or to themselves.
        offer(ownerToken, trip, travelerIdOf(verified())).expectStatus().isEqualTo(409);
        offer(ownerToken, trip, travelerIdOf(ownerToken)).expectStatus().isEqualTo(409);
        // Accept and decline with nothing pending.
        accept(memberToken, trip).expectStatus().isNotFound();
        decline(memberToken, trip).expectStatus().isNotFound();
        // A revoke with nothing pending is a success, but it dissolved nothing, so it says nothing.
        revoke(ownerToken, trip).expectStatus().isNoContent();

        assertThat(eventsNamed("ownership_offer_created")).isEmpty();
        assertThat(eventsNamed("ownership_offer_revoked")).isEmpty();
        assertThat(eventsNamed("ownership_offer_declined")).isEmpty();
        assertThat(eventsNamed("ownership_offer_voided")).isEmpty();
        assertThat(eventsNamed("ownership_transferred")).isEmpty();
    }

    @Test
    void theEventsNamePeopleByIdAndCarryNoEmailOrName() {
        // P3: ownership movement is a socially loaded fact about real people. The funnel needs "the
        // crown moved on trip X"; it never needs a name or an address.
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

    // --- fixtures -----------------------------------------------------------------------------------

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
                                {"title":"Trip","destinations":["Palawan"]}
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
