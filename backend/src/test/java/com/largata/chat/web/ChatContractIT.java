package com.largata.chat.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class ChatContractIT extends PostgresTestBase {

    private static final ObjectMapper JSON = new ObjectMapper();

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
    void anyMemberSendsAndEveryMemberReadsTheOneThread() {
        Fixture trip = tripWithAMember();

        String sent = idOf(sendAs(trip.member(), trip, "Booked the van."));

        assertThat(idsOf(threadAs(trip.owner(), trip)))
                .as("one thread per trip, shared by every member")
                .containsExactly(sent);
        assertThat(idsOf(threadAs(trip.member(), trip))).containsExactly(sent);
    }


    @Test
    void theThreadReadsNewestFirst() {
        Fixture trip = tripWithAMember();

        String first = idOf(sendAs(trip.owner(), trip, "First"));
        String second = idOf(sendAs(trip.owner(), trip, "Second"));

        assertThat(idsOf(threadAs(trip.owner(), trip)))
                .as("newest-first on the wire; the client renders bottom-anchored")
                .containsExactly(second, first);
    }


    @Test
    void aMessageCarriesItsAuthorsIdentityJoinedAtRead() {
        Fixture trip = tripWithAMember();

        JsonNode message = sendAs(trip.member(), trip, "The driver is Rico.");

        assertThat(message.path("author").path("travelerId").asString())
                .isEqualTo(rig.travelerIdOf(trip.member()).toString());
        assertThat(message.path("author").path("handle").asString()).isEqualTo(trip.memberHandle());
        assertThat(message.path("body").asString()).isEqualTo("The driver is Rico.");
        assertThat(message.path("at").isNull()).isFalse();
    }


    @Test
    void aDepartedAuthorsMessagesSurviveAndStillRenderByHandle() {
        Fixture trip = tripWithAMember();
        String sent = idOf(sendAs(trip.member(), trip, "See everyone at the pier."));

        removeMember(trip);

        JsonNode thread = threadAs(trip.owner(), trip);
        assertThat(idsOf(thread))
                .as("decision 2 - chat is a record; words outlive the membership that wrote them")
                .containsExactly(sent);
        assertThat(itemsOf(thread).getFirst().path("author").path("handle").asString())
                .as("the handle is joined from the surviving traveler row at read time")
                .isEqualTo(trip.memberHandle());
    }


    @Test
    void aNonMemberIsAnsweredNotFoundOnBothDoors() {
        Fixture trip = tripWithAMember();
        String stranger = rig.travelerWithHandle("stranger" + shortTag());

        rig.send(HttpMethod.POST, messagesUri(trip), stranger, body("Hello?"))
                .expectStatus()
                .isNotFound();
        rig.send(HttpMethod.GET, messagesUri(trip), stranger, null).expectStatus().isNotFound();
    }


    @Test
    void publishingClosesChatForOwnerAndMemberAlike() {
        Fixture trip = tripWithAMember();
        sendAs(trip.owner(), trip, "Before publishing");
        publish(trip);

        assertThat(refusalOf(rig.send(HttpMethod.POST, messagesUri(trip), trip.owner(), body("Owner"))))
                .isEqualTo("CHAT_CLOSED");
        assertThat(refusalOf(rig.send(HttpMethod.POST, messagesUri(trip), trip.member(), body("Member"))))
                .as("decision 3 - publishing closes chat for everyone, not just non-owners")
                .isEqualTo("CHAT_CLOSED");
    }


    @Test
    void unpublishingReopensChatWithItsHistoryIntact() {
        Fixture trip = tripWithAMember();
        String before = idOf(sendAs(trip.owner(), trip, "Before publishing"));
        publish(trip);
        unpublish(trip);

        String after = idOf(sendAs(trip.owner(), trip, "After unpublishing"));

        assertThat(idsOf(threadAs(trip.owner(), trip)))
                .as("publish hides and freezes, never deletes - the S4.1 symmetric-unpublish posture")
                .containsExactly(after, before);
    }


    @Test
    void readsStayOpenWhilePublishedSoTheUnpublishReturnPathWorks() {
        Fixture trip = tripWithAMember();
        String sent = idOf(sendAs(trip.owner(), trip, "Still readable"));

        publish(trip);

        assertThat(idsOf(threadAs(trip.owner(), trip)))
                .as("decision 3 - reads stay member-gated and unclosed; only writes refuse")
                .containsExactly(sent);
    }


    @Test
    void archivingFreezesTheThreadHonestlyForTheOwnerAndInvisiblyForAMember() {
        Fixture trip = tripWithAMember();
        sendAs(trip.owner(), trip, "Best trip yet.");

        archive(trip);

        assertThat(refusalOf(rig.send(HttpMethod.POST, messagesUri(trip), trip.owner(), body("More"))))
                .as("the WriteFence answers the owner honestly")
                .isEqualTo("TRIP_ARCHIVED");
        rig.send(HttpMethod.POST, messagesUri(trip), trip.member(), body("More"))
                .expectStatus()
                .isNotFound();
    }


    @Test
    void aBlankOrOversizedMessageIsRefusedByName() {
        Fixture trip = tripWithAMember();

        assertThat(refusalOf(rig.send(HttpMethod.POST, messagesUri(trip), trip.owner(), body("   "))))
                .isEqualTo("CHAT_MESSAGE_BODY_MISSING");
        assertThat(
                        refusalOf(
                                rig.send(
                                        HttpMethod.POST,
                                        messagesUri(trip),
                                        trip.owner(),
                                        body("x".repeat(2_001)))))
                .isEqualTo("CHAT_MESSAGE_BODY_TOO_LONG");
    }


    @Test
    void everyFenceAnswersBeforeValidationDoes() {
        Fixture trip = tripWithAMember();
        String stranger = rig.travelerWithHandle("stranger" + shortTag());

        rig.send(HttpMethod.POST, messagesUri(trip), stranger, body("   "))
                .expectStatus()
                .isNotFound();

        archive(trip);

        assertThat(refusalOf(rig.send(HttpMethod.POST, messagesUri(trip), trip.owner(), body("   "))))
                .as("the fences run in spec order, so an unwritable trip refuses before the body is judged")
                .isEqualTo("TRIP_ARCHIVED");
    }


    @Test
    void theCapItselfIsAcceptedAtExactlyTwoThousand() {
        Fixture trip = tripWithAMember();

        JsonNode sent = sendAs(trip.owner(), trip, "x".repeat(2_000));

        assertThat(sent.path("body").asString().length())
                .as("2,000 is the cap, not the first refusal")
                .isEqualTo(2_000);
    }


    @Test
    void theThreadPagesOlderMessagesAndAnswersNullWhenExhausted() {
        Fixture trip = tripWithAMember();
        List<String> sent = new ArrayList<>();
        for (int index = 0; index < 5; index++) {
            sent.add(idOf(sendAs(trip.owner(), trip, "Message " + index)));
        }

        JsonNode firstPage = threadPageAs(trip.owner(), trip, null, 2);
        assertThat(idsOf(firstPage)).containsExactly(sent.get(4), sent.get(3));

        JsonNode secondPage =
                threadPageAs(trip.owner(), trip, firstPage.path("nextCursor").asString(), 2);
        assertThat(idsOf(secondPage)).containsExactly(sent.get(2), sent.get(1));

        JsonNode lastPage =
                threadPageAs(trip.owner(), trip, secondPage.path("nextCursor").asString(), 2);
        assertThat(idsOf(lastPage)).containsExactly(sent.getFirst());
        assertThat(lastPage.path("nextCursor").isNull())
                .as("an exhausted list answers null, which the client compares with ?? never !==")
                .isTrue();
    }


    @Test
    void sendingTouchesNeitherThePlanVersionNorTheHistoryNorAnyLease() {
        Fixture trip = tripWithAMember();
        long planVersionBefore = rig.planVersionOf(trip.owner(), trip.tripId());

        sendAs(trip.owner(), trip, "Chat is not a plan edit.");

        assertThat(rig.planVersionOf(trip.owner(), trip.tripId()))
                .as("decision 5 - no planVersion bump")
                .isEqualTo(planVersionBefore);
        assertThat(rig.historyActs(trip.tripId()))
                .as("decision 5 - chat and activity history stay strangers")
                .isEmpty();
        assertThat(leaseCountOf(trip.tripId()))
                .as("decision 5 - no Editing Session, no lease")
                .isZero();
    }


    private record Fixture(String owner, String member, String memberHandle, String tripId) {}


    private Fixture tripWithAMember() {
        String owner = rig.travelerWithHandle("owner" + shortTag());
        String tripId = rig.createTrip(owner, 3);
        String memberHandle = "member" + shortTag();
        String member = rig.joinAsMember(owner, tripId, memberHandle);
        return new Fixture(owner, member, memberHandle, tripId);
    }


    private static String shortTag() {
        return UUID.randomUUID().toString().substring(0, 6).replace("-", "");
    }


    private static String messagesUri(Fixture trip) {
        return "/v1/itineraries/" + trip.tripId() + "/chat/messages";
    }


    private static String body(String text) {
        return "{\"body\":\"" + text + "\"}";
    }


    private JsonNode sendAs(String token, Fixture trip, String text) {
        return parse(
                rig.send(HttpMethod.POST, messagesUri(trip), token, body(text))
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent());
    }


    private JsonNode threadAs(String token, Fixture trip) {
        return threadPageAs(token, trip, null, null);
    }


    private JsonNode threadPageAs(String token, Fixture trip, String cursor, Integer limit) {
        StringBuilder uri = new StringBuilder(messagesUri(trip)).append("?");
        if (cursor != null) {
            uri.append("cursor=").append(cursor).append("&");
        }
        if (limit != null) {
            uri.append("limit=").append(limit);
        }
        return parse(
                rig.send(HttpMethod.GET, uri.toString(), token, null)
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent());
    }


    private void publish(Fixture trip) {
        rest.post()
                .uri("/v1/itineraries/" + trip.tripId() + "/start")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isOk();
        rest.post()
                .uri("/v1/itineraries/" + trip.tripId() + "/complete")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isOk();
        rest.post()
                .uri("/v1/itineraries/" + trip.tripId() + "/publish")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void unpublish(Fixture trip) {
        rest.post()
                .uri("/v1/itineraries/" + trip.tripId() + "/unpublish")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void archive(Fixture trip) {
        rest.post()
                .uri("/v1/itineraries/" + trip.tripId() + "/archive")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void removeMember(Fixture trip) {
        rest.method(HttpMethod.DELETE)
                .uri(
                        "/v1/itineraries/"
                                + trip.tripId()
                                + "/members/"
                                + rig.travelerIdOf(trip.member()))
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isNoContent();
    }


    private long leaseCountOf(String tripId) {
        return jdbc.queryForObject(
                "SELECT COUNT(*) FROM edit_lease WHERE itinerary_id = ?",
                Long.class,
                UUID.fromString(tripId));
    }


    private static String refusalOf(RestTestClient.ResponseSpec response) {
        return parse(response.expectBody().returnResult().getResponseBodyContent())
                .path("code")
                .asString();
    }


    private static List<JsonNode> itemsOf(JsonNode page) {
        List<JsonNode> items = new ArrayList<>();
        page.path("items").forEach(items::add);
        return items;
    }


    private static List<String> idsOf(JsonNode page) {
        return itemsOf(page).stream().map(item -> item.path("id").asString()).toList();
    }


    private static String idOf(JsonNode message) {
        return message.path("id").asString();
    }


    private static JsonNode parse(byte[] body) {
        return JSON.readTree(new String(body));
    }
}
