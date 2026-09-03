package com.largata.itinerary.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class PublishedProjectionIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    private static final ObjectMapper JSON = new ObjectMapper();


    private static final List<String> PROJECTION_FIELDS =
            List.of(
                    "id",
                    "title",
                    "destination",
                    "pin",
                    "description",
                    "standouts",
                    "bestTimeOfYear",
                    "coverImageUrl",
                    "durationDays",
                    "creator",
                    "estimatedCost",
                    "days",
                    "forkCount",
                    "forkedFrom");


    private static final List<String> DAY_FIELDS = List.of("id", "ordinal", "title", "activities");


    private static final List<String> ACTIVITY_FIELDS =
            List.of(
                    "id",
                    "sortOrder",
                    "title",
                    "timeOfDay",
                    "costAmount",
                    "costCurrency",
                    "place",
                    "pin",
                    "description",
                    "notes",
                    "externalUrl",
                    "bookingPurpose",
                    "bookingProvider",
                    "bookingPriceAmount",
                    "bookingPriceCurrency",
                    "photos");


    private static final List<String> CREATOR_FIELDS = List.of("id", "handle", "displayName", "avatarUrl");

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void theProjectionCarriesExactlyTheseFieldsAndNothingElseEverLeaks() {
        String owner = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        publish(owner, tripId);

        JsonNode projection = JSON.readTree(rawBody(publicView(freshTraveler(), tripId).expectStatus().isOk()));

        assertThat(fieldsOf(projection))
                .as("the absence rule: no date span, no lifecycle state, no stamps, no roster, no attribution")
                .containsExactlyInAnyOrderElementsOf(PROJECTION_FIELDS);
        assertThat(fieldsOf(projection.get("creator"))).containsExactlyInAnyOrderElementsOf(CREATOR_FIELDS);

        JsonNode day = projection.get("days").get(0);
        assertThat(fieldsOf(day)).containsExactlyInAnyOrderElementsOf(DAY_FIELDS);
        assertThat(fieldsOf(day.get("activities").get(0))).containsExactlyInAnyOrderElementsOf(ACTIVITY_FIELDS);
    }


    @Test
    void aPinReachesStrangersByFounderRuling_andCarriesNothingBesidesThePointItself() {
        String owner = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        publish(owner, tripId);

        JsonNode projection = JSON.readTree(rawBody(publicView(freshTraveler(), tripId).expectStatus().isOk()));
        JsonNode activityPin = projection.get("days").get(0).get("activities").get(0).get("pin");

        assertThat(activityPin)
                .as("an unpinned activity publishes an explicit null, never half a pin")
                .isNotNull();
        if (!activityPin.isNull()) {
            assertThat(fieldsOf(activityPin))
                    .as("INV-11 as amended: a Pin is a point and a zoom — never a timestamp, never a traveler")
                    .containsExactlyInAnyOrder("lat", "lng", "zoom");
        }
    }


    @Test
    void theWholeSerializedPayloadNamesNothingTheAbsenceRuleForbids() {
        String owner = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        publish(owner, tripId);

        String payload = rawBody(publicView(freshTraveler(), tripId).expectStatus().isOk());

        assertThat(payload)
                .as("the dates that would reveal the traveler is away from home")
                .doesNotContain("2027-03-04", "2027-03-08", "startDate", "endDate")
                .as("the lifecycle, its stamps and the workspace's own state")
                .doesNotContain("startedAt", "completedAt", "\"state\"", "workspaceState", "archived")
                .as("the roster, the owner's raw id, and per-field edit attribution")
                .doesNotContain("lastEditedBy", "lastEditedAt", "ownerId", "lease", "members")
                .as("the status itself has no reader on a page that only exists when published")
                .doesNotContain("status", "createdAt");
    }


    @Test
    void theDurationComesFromTheDayCountAndNotFromTheDateSpan() {
        String owner = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        publish(owner, tripId);

        publicView(freshTraveler(), tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.durationDays")
                .isEqualTo(2)
                .jsonPath("$.days.length()")
                .isEqualTo(2);
    }


    @Test
    void aNonMemberSeesThePageOnlyWhileItIsPublished() {
        String owner = freshTraveler();
        String consumer = freshTraveler();
        String tripId = datedTripWithAPlan(owner);

        publicView(consumer, tripId).expectStatus().isNotFound();

        publish(owner, tripId);
        publicView(consumer, tripId).expectStatus().isOk();

        act(owner, tripId, "unpublish");
        publicView(consumer, tripId).expectStatus().isNotFound();

        publish(owner, tripId);
        publicView(consumer, tripId).expectStatus().isOk().expectBody().jsonPath("$.id").isEqualTo(tripId);
    }


    @Test
    void aPrivatelyPublishedItineraryIsReadableByCollaboratorsAndNobodyElse() {
        String owner = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        String member = admitMemberTo(tripId);
        String stranger = freshTraveler();

        publishTo(owner, tripId, "private");

        publicView(owner, tripId).expectStatus().isOk();
        publicView(member, tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.id")
                .isEqualTo(tripId);
        publicView(stranger, tripId)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ITINERARY_NOT_FOUND");
    }


    @Test
    void movingTheAudienceToPublicOpensItToStrangersWithoutTouchingTheCollaborators() {
        String owner = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        String member = admitMemberTo(tripId);
        String stranger = freshTraveler();

        publishTo(owner, tripId, "private");
        publicView(stranger, tripId).expectStatus().isNotFound();

        showTo(owner, tripId, "public");
        publicView(stranger, tripId).expectStatus().isOk();
        publicView(member, tripId).expectStatus().isOk();

        showTo(owner, tripId, "private");
        publicView(stranger, tripId).expectStatus().isNotFound();
        publicView(member, tripId).expectStatus().isOk();
    }


    @Test
    void anUnpublishedItineraryHasNoPublicPageForAnyone_notEvenACollaborator() {
        String owner = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        String member = admitMemberTo(tripId);

        publicView(member, tripId)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ITINERARY_NOT_FOUND");
        publicView(owner, tripId)
                .expectStatus()
                .isNotFound();

        preview(owner, tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.id")
                .isEqualTo(tripId);
    }


    @Test
    void aCompletedButUnpublishedItineraryStillHasNoPage_evenThoughItsAudienceIsPublic() {
        String owner = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        String stranger = freshTraveler();
        travel(owner, tripId);

        publicView(stranger, tripId)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ITINERARY_NOT_FOUND");

        act(owner, tripId, "publish");
        publicView(stranger, tripId)
                .expectStatus()
                .isOk();
    }


    @Test
    void maskingIsIndistinguishableFromNeverHavingExisted() {
        String tripId = datedTripWithAPlan(freshTraveler());
        String consumer = freshTraveler();

        String privateRead = rawBody(publicView(consumer, tripId).expectStatus().isNotFound());
        String neverExisted =
                rawBody(publicView(consumer, UUID.randomUUID().toString()).expectStatus().isNotFound());

        assertThat(codeIn(privateRead)).isEqualTo(codeIn(neverExisted)).isEqualTo("ITINERARY_NOT_FOUND");
    }


    @Test
    void archivingTakesThePublicPageDownAndUnarchivingBringsItBack() {
        String owner = freshTraveler();
        String consumer = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        publish(owner, tripId);

        act(owner, tripId, "archive");
        publicView(consumer, tripId).expectStatus().isNotFound();

        act(owner, tripId, "unarchive");
        publicView(consumer, tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.id")
                .isEqualTo(tripId);
    }


    @Test
    void aVisitorCannotReadAPublishedPageBecauseThePublicMeansSignedInTravelers() {
        String owner = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        publish(owner, tripId);

        rest.get().uri("/v1/published-itineraries/" + tripId).exchange().expectStatus().isUnauthorized();
    }


    @Test
    void theOwnersPreviewIsByteForByteWhatTheConsumerIsServed() {
        String owner = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        publish(owner, tripId);

        String previewed = rawBody(preview(owner, tripId).expectStatus().isOk());
        String served = rawBody(publicView(freshTraveler(), tripId).expectStatus().isOk());

        assertThat(previewed).isEqualTo(served);
    }


    @Test
    void theOwnerPreviewsBeforePublishingWhileEveryoneElseIsStillMasked() {
        String owner = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        String member = admitMemberTo(tripId);

        preview(owner, tripId).expectStatus().isOk().expectBody().jsonPath("$.id").isEqualTo(tripId);
        publicView(freshTraveler(), tripId).expectStatus().isNotFound();

        preview(member, tripId)
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
        preview(freshTraveler(), tripId).expectStatus().isNotFound();
    }


    @Test
    void theBylineIsTheCurrentOwnerAndAnOwnershipTransferMovesIt() {
        String owner = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        String successor = admitMemberTo(tripId);
        UUID successorId = travelerIdOf(successor);
        publish(owner, tripId);

        publicView(freshTraveler(), tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.creator.id")
                .isEqualTo(travelerIdOf(owner).toString());

        unpublish(owner, tripId);
        transferOwnership(owner, tripId, successor);
        republish(successor, tripId);

        publicView(freshTraveler(), tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.creator.id")
                .isEqualTo(successorId.toString());
    }


    @Test
    void creatorTipsCrossTheWallOntoThePublishedDayCards() {
        String owner = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        publish(owner, tripId);

        publicView(freshTraveler(), tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.days[0].activities[0].notes")
                .isEqualTo("Book the earliest slot at 8:00 AM to avoid the large tour groups!");
    }


    @Test
    void theBookingCardCrossesTheWall_itIsTheWholeReasonAForkerCanRebookTheTrip() {
        String owner = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        publish(owner, tripId);

        publicView(freshTraveler(), tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.days[0].activities[0].bookingProvider")
                .isEqualTo("Klook")
                .jsonPath("$.days[0].activities[0].bookingPurpose")
                .isEqualTo("Van transfer")
                .jsonPath("$.days[0].activities[0].bookingPriceAmount")
                .isEqualTo("1800.00")
                .jsonPath("$.days[0].activities[0].bookingPriceCurrency")
                .isEqualTo("PHP");
    }


    @Test
    void theBookingPriceIsItsOwnNumberAndNeverFeedsTheDerivedTotal() {
        String owner = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        publish(owner, tripId);

        publicView(freshTraveler(), tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.estimatedCost.amount")
                .isEqualTo("800.00")
                .jsonPath("$.days[0].activities[0].bookingPriceAmount")
                .isEqualTo("1800.00");
    }


    @Test
    void everyPricedActivityCountsTowardOneTotalInTheTripsCurrency() {
        String owner = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        publish(owner, tripId);

        publicView(freshTraveler(), tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.estimatedCost.amount")
                .isEqualTo("800.00")
                .jsonPath("$.estimatedCost.currency")
                .isEqualTo("PHP");

        act(owner, tripId, "unpublish");
        addActivity(owner, tripId, secondDayOf(tripId), """
                {"title":"Ferry","costAmount":"40","costCurrency":"USD"}
                """);
        publish(owner, tripId);

        publicView(freshTraveler(), tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.estimatedCost.amount")
                .isEqualTo("840.00")
                .jsonPath("$.estimatedCost.currency")
                .isEqualTo("PHP")
                .jsonPath("$.days[1].activities[0].costAmount")
                .isEqualTo("40.00")
                .jsonPath("$.days[1].activities[0].costCurrency")
                .isEqualTo("PHP");
    }


    @Test
    void aFullyPricedPlanTotalsWithoutTheFromMarker() {
        String owner = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        publish(owner, tripId);

        publicView(freshTraveler(), tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.estimatedCost.amount")
                .isEqualTo("800.00")
                .jsonPath("$.estimatedCost.partial")
                .isEqualTo(false);
    }


    @Test
    void oneUnpricedActivityMarksTheTotalPartial_soAForkerNeverReadsItAsComplete() {
        String owner = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        addActivity(owner, tripId, secondDayOf(tripId), """
                {"title":"Somewhere for dinner"}
                """);
        publish(owner, tripId);

        publicView(freshTraveler(), tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.estimatedCost.amount")
                .isEqualTo("800.00")
                .jsonPath("$.estimatedCost.partial")
                .isEqualTo(true);
    }


    @Test
    void anExplicitZeroIsAStatedPrice_freeIsNotTheSameFactAsNotStated() {
        String owner = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        addActivity(owner, tripId, secondDayOf(tripId), """
                {"title":"Sunset walk","costAmount":"0","costCurrency":"PHP"}
                """);
        publish(owner, tripId);

        publicView(freshTraveler(), tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.estimatedCost.amount")
                .isEqualTo("800.00")
                .jsonPath("$.estimatedCost.partial")
                .isEqualTo(false);
    }


    @Test
    void aPlanWithNothingPricedHasNoTotalAtAll_neverAFromZero() {
        String owner = freshTraveler();
        String tripId =
                createItinerary(owner, """
                        {"title":"Someday, Japan","destination":"Japan","durationDays":1}
                        """);
        addActivity(owner, tripId, firstDayOf(tripId), """
                {"title":"Wander Shimokitazawa"}
                """);
        publish(owner, tripId);

        publicView(freshTraveler(), tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.estimatedCost")
                .doesNotExist();
    }


    @Test
    void aClientsOwnCurrencyCannotSplitTheTotal_theTripsCurrencyWins() {
        String owner = freshTraveler();
        String tripId = datedTripWithAPlan(owner);
        addActivity(owner, tripId, secondDayOf(tripId), """
                {"title":"Ferry","costAmount":"40","costCurrency":"USD"}
                """);
        addActivity(owner, tripId, secondDayOf(tripId), """
                {"title":"Somewhere for dinner"}
                """);
        publish(owner, tripId);

        publicView(freshTraveler(), tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.estimatedCost.currency")
                .isEqualTo("PHP")
                .jsonPath("$.estimatedCost.partial")
                .isEqualTo(true);
    }


    @Test
    void anEmptyItineraryProjectsCleanlyWithNoDaysNoDurationAndNoTotal() {
        String owner = freshTraveler();
        String tripId =
                createItinerary(owner, """
                        {"title":"Someday, Japan","destination":"Japan"}
                        """);
        publish(owner, tripId);

        publicView(freshTraveler(), tripId)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.durationDays")
                .isEqualTo(0)
                .jsonPath("$.days.length()")
                .isEqualTo(0)
                .jsonPath("$.estimatedCost")
                .doesNotExist()
                .jsonPath("$.creator.id")
                .exists();
    }


    private static List<String> fieldsOf(JsonNode node) {
        List<String> names = new ArrayList<>();
        Iterator<String> keys = node.propertyNames().iterator();
        while (keys.hasNext()) {
            names.add(keys.next());
        }
        return names;
    }

    private static String codeIn(String errorBody) {
        return JSON.readTree(errorBody).get("code").asString();
    }


    private RestTestClient.ResponseSpec publicView(String token, String itineraryId) {
        return rest.get()
                .uri("/v1/published-itineraries/" + itineraryId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }

    private RestTestClient.ResponseSpec preview(String token, String itineraryId) {
        return rest.get()
                .uri("/v1/itineraries/" + itineraryId + "/preview")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange();
    }


    private static String rawBody(RestTestClient.ResponseSpec spec) {
        return new String(spec.expectBody().returnResult().getResponseBodyContent());
    }


    private void publish(String token, String itineraryId) {
        travel(token, itineraryId);
        act(token, itineraryId, "publish");
    }

    private void unpublish(String token, String itineraryId) {
        act(token, itineraryId, "unpublish");
    }

    private void republish(String token, String itineraryId) {
        act(token, itineraryId, "publish");
    }

    private void publishTo(String token, String itineraryId, String audience) {
        travel(token, itineraryId);
        audienceOf(token, itineraryId, audience, "publish");
    }

    private void showTo(String token, String itineraryId, String audience) {
        audienceOf(token, itineraryId, audience, "audience");
    }

    private void audienceOf(String token, String itineraryId, String audience, String act) {
        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/" + act)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"audience\":\"" + audience + "\"}")
                .exchange()
                .expectStatus()
                .isOk();
    }

    private final Set<String> travelled = new HashSet<>();

    private void travel(String token, String itineraryId) {
        if (travelled.add(itineraryId)) {
            act(token, itineraryId, "start");
            act(token, itineraryId, "complete");
        }
    }

    private void act(String token, String itineraryId, String verb) {
        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/" + verb)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private String datedTripWithAPlan(String token) {
        String tripId =
                createItinerary(
                        token,
                        """
                        {"title":"Island Hopping in El Nido","destination":"Palawan",
                         "description":"Discover the breathtaking beauty of El Nido's lagoons.",
                         "startDate":"2027-03-04","endDate":"2027-03-08","durationDays":2}
                        """);
        addActivity(
                token,
                tripId,
                firstDayOf(tripId),
                """
                {"title":"Airport Transfer","timeOfDay":"14:00","costAmount":"500","costCurrency":"PHP",
                 "place":"Lio Airport","description":"A van transfer to El Nido town proper.",
                 "notes":"Book the earliest slot at 8:00 AM to avoid the large tour groups!",
                 "externalUrl":"https://example.test/transfer",
                 "bookingPurpose":"Van transfer","bookingProvider":"Klook",
                 "bookingPriceAmount":"1800","bookingPriceCurrency":"PHP"}
                """);
        addActivity(token, tripId, firstDayOf(tripId), """
                {"title":"Sunset at Las Cabanas","costAmount":"300","costCurrency":"PHP"}
                """);
        return tripId;
    }

    private void addActivity(String token, String itineraryId, UUID dayId, String body) {
        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/days/" + dayId + "/activities")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange()
                .expectStatus()
                .isCreated();
    }

    private UUID firstDayOf(String itineraryId) {
        return dayOf(itineraryId, 1);
    }

    private UUID secondDayOf(String itineraryId) {
        return dayOf(itineraryId, 2);
    }

    private UUID dayOf(String itineraryId, int ordinal) {
        return jdbc.queryForObject(
                "SELECT id FROM day WHERE itinerary_id = ? AND ordinal = ?",
                UUID.class,
                UUID.fromString(itineraryId),
                ordinal);
    }


    private void transferOwnership(String ownerToken, String itineraryId, String successorToken) {
        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/ownership-offer")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"travelerId\":\"" + travelerIdOf(successorToken) + "\"}")
                .exchange()
                .expectStatus()
                .isCreated();
        rest.post()
                .uri("/v1/itineraries/" + itineraryId + "/ownership-offer/accept")
                .header(HttpHeaders.AUTHORIZATION, bearer(successorToken))
                .exchange()
                .expectStatus()
                .isNoContent();
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
                JSON.readTree(
                                new String(
                                        rest.get()
                                                .uri("/v1/me")
                                                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                                                .exchange()
                                                .expectStatus()
                                                .isOk()
                                                .expectBody()
                                                .returnResult()
                                                .getResponseBodyContent()))
                        .get("id")
                        .asString());
    }

    private String createItinerary(String token, String body) {
        return JSON.readTree(
                        new String(
                                rest.post()
                                        .uri("/v1/itineraries")
                                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .body(body)
                                        .exchange()
                                        .expectStatus()
                                        .isCreated()
                                        .expectBody()
                                        .returnResult()
                                        .getResponseBodyContent()))
                .get("id")
                .asString();
    }

    private static String freshTraveler() {
        return TestJwtSupport.tokenFor("uid-" + UUID.randomUUID(), "traveler-" + UUID.randomUUID() + "@example.com");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
