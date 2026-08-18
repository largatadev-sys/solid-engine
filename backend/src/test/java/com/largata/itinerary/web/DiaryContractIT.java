package com.largata.itinerary.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.ObjectStoreTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.springframework.util.MultiValueMap;
import tools.jackson.databind.ObjectMapper;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class DiaryContractIT extends ObjectStoreTestBase {

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
    void aPostcardCarriesItsDevicePhotosItsDumpCopyAndItsCaption() throws IOException {
        Fixture trip = startedTrip();
        UUID dumpPhoto = uploadToDump(trip.owner(), trip);

        Entry posted =
                post(trip.owner(), trip, trip.activityId(), "Best day of the trip", List.of(dumpPhoto), 2);

        assertThat(posted.photos()).as("two device photos and one dump copy").hasSize(3);
        assertThat(posted.caption()).isEqualTo("Best day of the trip");
        assertThat(posted.activityId()).isEqualTo(trip.activityId());
        assertThat(idsOf(posted))
                .as("the dump photo is COPIED, never referenced — its id never appears in the entry")
                .doesNotContain(dumpPhoto);
    }


    @Test
    void aDumpCopySurvivesTheDumpPhotosDeletion() throws IOException {
        Fixture trip = startedTrip();
        UUID dumpPhoto = uploadToDump(trip.owner(), trip);
        Entry posted = post(trip.owner(), trip, trip.activityId(), null, List.of(dumpPhoto), 0);
        UUID copy = idsOf(posted).getFirst();

        rest.delete()
                .uri("/v1/itineraries/" + trip.tripId() + "/photo-dump/" + dumpPhoto)
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isNoContent();

        assertThat(bytesOf("/v1/media/" + copy, trip.owner()))
                .as("the entry owns its own bytes — one blob, one row")
                .isNotEmpty();
        rest.get()
                .uri("/v1/media/" + dumpPhoto)
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    @Test
    void aTripThatHasNotStartedRefusesTheWholeAct() throws IOException {
        Fixture draft = draftTrip();

        byte[] refusal =
                postExpecting(draft.owner(), draft, draft.activityId(), 400, List.of(), 1);

        assertThat(new String(refusal)).contains("TRIP_NOT_STARTED");
        assertThat(entryCountOf(draft)).isZero();
    }


    @Test
    void anUpcomingTripRefusesToo() throws IOException {
        Fixture upcoming = draftTrip();
        advance(upcoming, "finish-planning");

        byte[] refusal = postExpecting(upcoming.owner(), upcoming, upcoming.activityId(), 400, List.of(), 1);

        assertThat(new String(refusal)).contains("TRIP_NOT_STARTED");
    }


    @Test
    void aCompletedTripAcceptsARetrospectivePost() throws IOException {
        Fixture trip = startedTrip();
        advance(trip, "complete");

        Entry posted = post(trip.owner(), trip, trip.activityId(), "Looking back", List.of(), 1);

        assertThat(posted.photos()).hasSize(1);
        assertThat(posted.caption()).isEqualTo("Looking back");
    }


    @Test
    void aSecondPostForTheSameActivityRefuses() throws IOException {
        Fixture trip = startedTrip();
        post(trip.owner(), trip, trip.activityId(), null, List.of(), 1);

        byte[] refusal = postExpecting(trip.owner(), trip, trip.activityId(), 409, List.of(), 1);

        assertThat(new String(refusal)).contains("ACTIVITY_ALREADY_IN_DIARY");
        assertThat(entryCountOf(trip)).isEqualTo(1);
    }


    @Test
    void twoTravelersEachPostTheirOwnPostcardFromOneActivity() throws IOException {
        Fixture trip = startedTrip();

        post(trip.owner(), trip, trip.activityId(), "the owner's", List.of(), 1);
        post(trip.member(), trip, trip.activityId(), "the member's", List.of(), 1);

        assertThat(captionsOf(mine(trip.owner(), trip))).containsExactly("the owner's");
        assertThat(captionsOf(mine(trip.member(), trip))).containsExactly("the member's");
    }


    @Test
    void thePostcardIsASnapshotThatPlanEditsNeverRewrite() throws IOException {
        Fixture trip = startedTrip();
        Entry posted = post(trip.owner(), trip, trip.activityId(), "as it happened", List.of(), 1);
        assertThat(posted.activityTitle()).isEqualTo(ACTIVITY_TITLE);
        assertThat(posted.dayLabel()).isEqualTo("Day 1");

        renameActivity(trip, "Renamed after the fact");
        assertThat(only(mine(trip.owner(), trip)).activityTitle())
                .as("a rename never rewrites a memory already posted")
                .isEqualTo(ACTIVITY_TITLE);

        moveActivityToDayTwo(trip);
        Entry afterMove = only(mine(trip.owner(), trip));
        assertThat(afterMove.dayLabel()).as("nor does a move").isEqualTo("Day 1");
        assertThat(afterMove.activityId()).isEqualTo(trip.activityId());

        deleteActivity(trip);
        Entry afterDelete = only(mine(trip.owner(), trip));
        assertThat(afterDelete.activityTitle()).isEqualTo(ACTIVITY_TITLE);
        assertThat(afterDelete.dayLabel()).isEqualTo("Day 1");
        assertThat(afterDelete.activityId())
                .as("provenance clears structurally when the activity dies; the postcard stays")
                .isNull();
    }


    @Test
    void anEntrysPhotoServesWhoeverMayReadTheEntry() throws IOException {
        Fixture trip = startedTrip();
        Entry posted = post(trip.owner(), trip, trip.activityId(), null, List.of(), 1);
        UUID photoId = idsOf(posted).getFirst();

        assertThat(bytesOf("/v1/media/" + photoId, trip.owner())).isNotEmpty();
        assertThat(bytesOf("/v1/media/" + photoId, trip.member()))
                .as("the media audience follows the entry's, and every entry is public now")
                .isNotEmpty();
    }


    @Test
    void aMediaReadStillNeedsATraveler() throws IOException {
        Fixture trip = startedTrip();
        Entry posted = post(trip.owner(), trip, trip.activityId(), null, List.of(), 1);

        rest.get()
                .uri("/v1/media/" + idsOf(posted).getFirst())
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }


    @Test
    void theMineListNeverLeaksAnotherTravelersEntries() throws IOException {
        Fixture trip = startedTrip();
        post(trip.owner(), trip, trip.activityId(), "the owner's", List.of(), 1);

        assertThat(mine(trip.member(), trip)).as("the member has posted nothing").isEmpty();
    }


    @Test
    void theMineListSpeaksTheOnePaginationShapeLikeEveryOtherList() throws IOException {
        Fixture trip = startedTrip();
        post(trip.owner(), trip, trip.activityId(), "first", List.of(), 1);
        UUID second = rig.addActivity(trip.owner(), trip.tripId(), rig.dayAt(trip.tripId(), 1), "Later");
        post(trip.owner(), trip, second, "second", List.of(), 1);

        EntryPage firstPage = pageOf(trip.owner(), trip, "?limit=1");
        assertThat(firstPage.items()).hasSize(1);
        assertThat(firstPage.nextCursor()).isNotNull();

        EntryPage nextPage = pageOf(trip.owner(), trip, "?limit=1&cursor=" + firstPage.nextCursor());
        assertThat(nextPage.items()).hasSize(1);
        assertThat(nextPage.nextCursor()).isNull();

        assertThat(List.of(firstPage.items().getFirst().caption(), nextPage.items().getFirst().caption()))
                .containsExactly("first", "second");
    }


    @Test
    void aNonMemberIsMaskedOnEveryDiaryEndpoint() throws IOException {
        Fixture trip = startedTrip();
        Entry posted = post(trip.owner(), trip, trip.activityId(), null, List.of(), 1);
        String stranger = rig.travelerWithHandle(handle());

        rest.get()
                .uri(diaryUri(trip))
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound();
        rest.get()
                .uri(diaryUri(trip) + "/" + posted.id())
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound();
        rig.send(HttpMethod.DELETE, diaryUri(trip) + "/" + posted.id(), stranger, null)
                .expectStatus()
                .isNotFound();
        postExpecting(stranger, trip, trip.activityId(), 404, List.of(), 1);
    }


    @Test
    void aZeroPhotoPostAndASixPhotoPostAreBothRefusedWholesale() throws IOException {
        Fixture trip = startedTrip();

        assertThat(new String(postExpecting(trip.owner(), trip, trip.activityId(), 400, List.of(), 0)))
                .contains("DIARY_ENTRY_NEEDS_A_PHOTO");
        assertThat(new String(postExpecting(trip.owner(), trip, trip.activityId(), 400, List.of(), 6)))
                .contains("TOO_MANY_DIARY_PHOTOS");
        assertThat(entryCountOf(trip)).as("neither refusal leaves a half-built postcard behind").isZero();
    }


    @Test
    void anArchivedTripRefusesNewPostsWhileItsEntriesStayReadable() throws IOException {
        Fixture trip = startedTrip();
        Entry posted = post(trip.owner(), trip, trip.activityId(), "before the archive", List.of(), 1);
        UUID secondActivity = rig.addActivity(trip.owner(), trip.tripId(), rig.dayAt(trip.tripId(), 1), "Later");
        archive(trip);

        postExpecting(trip.owner(), trip, secondActivity, 409, List.of(), 1);

        assertThat(captionsOf(mine(trip.owner(), trip)))
                .as("the fence stops writes; a memory already posted stays readable")
                .containsExactly("before the archive");
        assertThat(bytesOf("/v1/media/" + idsOf(posted).getFirst(), trip.owner())).isNotEmpty();
    }


    @Test
    void aCaptionEditLandsAndTheRestOfThePostcardIsUntouched() throws IOException {
        Fixture trip = startedTrip();
        Entry posted = post(trip.owner(), trip, trip.activityId(), "first thoughts", List.of(), 1);

        Entry edited = recaption(trip.owner(), trip, posted.id(), "second thoughts");

        assertThat(edited.caption()).isEqualTo("second thoughts");
        assertThat(idsOf(edited)).isEqualTo(idsOf(posted));
        assertThat(edited.activityTitle()).isEqualTo(ACTIVITY_TITLE);
    }


    @Test
    void aPhotoJoinsAnExistingPostcardFromTheDeviceAndFromTheDump() throws IOException {
        Fixture trip = startedTrip();
        Entry posted = post(trip.owner(), trip, trip.activityId(), null, List.of(), 1);
        UUID dumpPhoto = uploadToDump(trip.owner(), trip);

        Entry withDevice = addDevicePhoto(trip.owner(), trip, posted.id());
        assertThat(withDevice.photos()).hasSize(2);

        Entry withDump = addFromDump(trip.owner(), trip, posted.id(), dumpPhoto);
        assertThat(withDump.photos()).hasSize(3);
        assertThat(idsOf(withDump)).doesNotContain(dumpPhoto);
    }


    @Test
    void theSixthPhotoIsRefusedAndTheLastOneCannotBeRemoved() throws IOException {
        Fixture trip = startedTrip();
        Entry full = post(trip.owner(), trip, trip.activityId(), null, List.of(), 5);

        assertThat(new String(addDevicePhotoExpecting(trip.owner(), trip, full.id(), 400)))
                .contains("TOO_MANY_DIARY_PHOTOS");

        Entry downToOne = full;
        for (UUID photoId : idsOf(full).subList(0, 4)) {
            downToOne = removePhoto(trip.owner(), trip, full.id(), photoId);
        }
        assertThat(downToOne.photos()).hasSize(1);

        byte[] refusal =
                rig.send(
                                HttpMethod.DELETE,
                                diaryUri(trip) + "/" + full.id() + "/photos/" + idsOf(downToOne).getFirst(),
                                trip.owner(),
                                null)
                        .expectStatus()
                        .isBadRequest()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        assertThat(new String(refusal))
                .as("a postcard never goes photo-less")
                .contains("DIARY_ENTRY_NEEDS_A_PHOTO");
    }


    @Test
    void deletingAnEntryTakesItsBytesAndFreesTheActivityToBePostedAgain() throws IOException {
        Fixture trip = startedTrip();
        Entry posted = post(trip.owner(), trip, trip.activityId(), null, List.of(), 2);
        List<UUID> photoIds = idsOf(posted);

        rig.send(HttpMethod.DELETE, diaryUri(trip) + "/" + posted.id(), trip.owner(), null)
                .expectStatus()
                .isNoContent();

        assertThat(mine(trip.owner(), trip)).isEmpty();
        photoIds.forEach(
                photoId ->
                        rest.get()
                                .uri("/v1/media/" + photoId)
                                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                                .exchange()
                                .expectStatus()
                                .isNotFound());
        assertThat(photosLeftFor(posted.id())).as("no dangling rows, no leaked blobs").isZero();

        Entry reposted = post(trip.owner(), trip, trip.activityId(), "second time", List.of(), 1);
        assertThat(reposted.caption()).isEqualTo("second time");
    }


    @Test
    void anotherMemberCannotTouchMyPostcard() throws IOException {
        Fixture trip = startedTrip();
        Entry posted = post(trip.owner(), trip, trip.activityId(), "mine", List.of(), 1);

        rig.send(
                        HttpMethod.PATCH,
                        diaryUri(trip) + "/" + posted.id(),
                        trip.member(),
                        "{\"caption\":\"not yours to write\"}")
                .expectStatus()
                .isNotFound();
        rig.send(HttpMethod.DELETE, diaryUri(trip) + "/" + posted.id(), trip.member(), null)
                .expectStatus()
                .isNotFound();

        assertThat(only(mine(trip.owner(), trip)).caption()).isEqualTo("mine");
    }


    @Test
    void anArchivedTripRefusesEveryEntryWriteWhileTheAuthorStillReads() throws IOException {
        Fixture trip = startedTrip();
        Entry posted = post(trip.owner(), trip, trip.activityId(), "kept", List.of(), 2);
        archive(trip);

        rig.send(
                        HttpMethod.PATCH,
                        diaryUri(trip) + "/" + posted.id(),
                        trip.owner(),
                        "{\"caption\":\"after the fence\"}")
                .expectStatus()
                .isEqualTo(409);
        addDevicePhotoExpecting(trip.owner(), trip, posted.id(), 409);
        rig.send(
                        HttpMethod.DELETE,
                        diaryUri(trip) + "/" + posted.id() + "/photos/" + idsOf(posted).getFirst(),
                        trip.owner(),
                        null)
                .expectStatus()
                .isEqualTo(409);
        rig.send(HttpMethod.DELETE, diaryUri(trip) + "/" + posted.id(), trip.owner(), null)
                .expectStatus()
                .isEqualTo(409);

        assertThat(only(mine(trip.owner(), trip)).caption()).isEqualTo("kept");
    }


    @Test
    void myDiaryTripsGroupsMyEntriesAndCountsThem() throws IOException {
        Fixture first = startedTrip();
        post(first.owner(), first, first.activityId(), null, List.of(), 1);
        UUID second = rig.addActivity(first.owner(), first.tripId(), rig.dayAt(first.tripId(), 1), "Another");
        post(first.owner(), first, second, null, List.of(), 1);

        List<TripSummary> trips = myTrips(first.owner(), "");

        assertThat(trips).hasSize(1);
        assertThat(trips.getFirst().itineraryId()).isEqualTo(UUID.fromString(first.tripId()));
        assertThat(trips.getFirst().entryCount()).isEqualTo(2);
        assertThat(trips.getFirst().title()).isNotBlank();
        assertThat(trips.getFirst().destination())
                .as("the profile's section sub-line draws the trip's location")
                .isEqualTo("Palawan");
        assertThat(trips.getFirst().dayCount())
                .as("…and its length, beside it")
                .isEqualTo(3);
        assertThat(trips.getFirst().coverImageUrl())
                .as("the section's thumbnail is the trip's cover — absent until one is uploaded,"
                        + " which is why the tab falls back to a plain well rather than a broken image")
                .isNull();
    }


    @Test
    void myDiaryTripsShowsOnlyMineAndPagesInTheStandardShape() throws IOException {
        Fixture mineOne = startedTrip();
        post(mineOne.owner(), mineOne, mineOne.activityId(), null, List.of(), 1);
        Fixture mineTwo = startedTrip(mineOne.owner());
        post(mineOne.owner(), mineTwo, mineTwo.activityId(), null, List.of(), 1);
        post(mineOne.member(), mineOne, mineOne.activityId(), null, List.of(), 1);

        TripPage firstPage = myTripsPage(mineOne.owner(), "?limit=1");
        assertThat(firstPage.items()).hasSize(1);
        assertThat(firstPage.nextCursor()).isNotNull();

        TripPage secondPage = myTripsPage(mineOne.owner(), "?limit=1&cursor=" + firstPage.nextCursor());
        assertThat(secondPage.items()).hasSize(1);
        assertThat(secondPage.nextCursor()).isNull();

        assertThat(List.of(firstPage.items().getFirst().itineraryId(), secondPage.items().getFirst().itineraryId()))
                .containsExactlyInAnyOrder(
                        UUID.fromString(mineOne.tripId()), UUID.fromString(mineTwo.tripId()));

        assertThat(myTrips(mineOne.member(), "").getFirst().entryCount())
                .as("the member sees their own single entry, never the owner's two")
                .isEqualTo(1);
    }


    @Test
    void anArchivedTripsEntriesStillAppearInMyDiary() throws IOException {
        Fixture trip = startedTrip();
        post(trip.owner(), trip, trip.activityId(), "kept after archiving", List.of(), 1);
        archive(trip);

        assertThat(myTrips(trip.owner(), "")).hasSize(1);
        assertThat(captionsOf(mine(trip.owner(), trip))).containsExactly("kept after archiving");
    }


    @Test
    void theDiaryListPromisesOnlyTheTripsWhoseDiaryTheCallerCanOpen() throws IOException {
        Fixture archived = startedTrip();
        post(archived.member(), archived, archived.activityId(), "the member's memory", List.of(), 1);
        post(archived.owner(), archived, archived.activityId(), "the owner's memory", List.of(), 1);
        archive(archived);

        assertThat(tripIdsIn(myTrips(archived.member(), "")))
                .as("a member's archived trip is masked at the per-trip door, so it cannot be listed here")
                .doesNotContain(archived.tripId());
        assertThat(tripIdsIn(myTrips(archived.owner(), "")))
                .as("the owner legitimately still sees their own archived trip")
                .contains(archived.tripId());

        Fixture departed = startedTrip();
        post(departed.member(), departed, departed.activityId(), "before leaving", List.of(), 1);
        UUID departingId = rig.travelerIdOf(departed.member());
        rig.send(
                        HttpMethod.DELETE,
                        "/v1/itineraries/" + departed.tripId() + "/members/" + departingId,
                        departed.member(),
                        null)
                .expectStatus()
                .isNoContent();

        assertThat(tripIdsIn(myTrips(departed.member(), "")))
                .as("a trip they have left is the same dead card by a different door")
                .doesNotContain(departed.tripId());
    }


    @Test
    void theLiveRowsAndTheCursorEnvelopeSurviveTheFencesExtraPredicates() throws IOException {
        String owner = rig.travelerWithHandle(handle());
        Fixture live = startedTrip(owner);
        post(owner, live, live.activityId(), "a live trip", List.of(), 1);
        Fixture second = startedTrip(owner);
        post(owner, second, second.activityId(), "another live trip", List.of(), 1);
        Fixture archived = startedTrip(owner);
        post(owner, archived, archived.activityId(), "an archived trip", List.of(), 1);
        archive(archived);

        TripPage first = myTripsPage(owner, "?limit=2");
        assertThat(first.items()).hasSize(2);
        assertThat(first.nextCursor()).as("a full page hands back a cursor").isNotNull();

        TripPage next = myTripsPage(owner, "?limit=2&cursor=" + first.nextCursor());
        assertThat(tripIdsIn(concat(first.items(), next.items())))
                .as("paging over mixed live and archived data reaches every openable trip exactly once")
                .containsExactlyInAnyOrder(live.tripId(), second.tripId(), archived.tripId());
        assertThat(next.nextCursor()).as("the last page is exhausted").isNull();
    }


      @Test
    void aTravelerWithNothingInSightStillHasTheirCursorValidatedRatherThanIgnored() {
        String stranger = rig.travelerWithHandle(handle());

        rest.get()
                .uri("/v1/me/diary/trips?cursor=not-a-cursor")
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("MALFORMED_CURSOR");

        assertThat(myTrips(stranger, "")).as("and an honest empty page without one").isEmpty();
    }


    private static List<TripSummary> concat(List<TripSummary> first, List<TripSummary> second) {
        return Stream.concat(first.stream(), second.stream()).toList();
    }


    private static List<String> tripIdsIn(List<TripSummary> trips) {
        return trips.stream().map(trip -> trip.itineraryId().toString()).toList();
    }


    private Entry post(
            String token, Fixture trip, UUID activityId, String caption, List<UUID> fromDump, int devicePhotos)
            throws IOException {
        Entry body =
                rest.post()
                        .uri(diaryUri(trip))
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(postBody(activityId, caption, fromDump, devicePhotos))
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody(Entry.class)
                        .returnResult()
                        .getResponseBody();
        assertThat(body).isNotNull();
        return body;
    }


    private byte[] postExpecting(
            String token, Fixture trip, UUID activityId, int status, List<UUID> fromDump, int devicePhotos)
            throws IOException {
        return rest.post()
                .uri(diaryUri(trip))
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(postBody(activityId, null, fromDump, devicePhotos))
                .exchange()
                .expectStatus()
                .isEqualTo(status)
                .expectBody()
                .returnResult()
                .getResponseBodyContent();
    }


    private MultiValueMap<String, HttpEntity<?>> postBody(
            UUID activityId, String caption, List<UUID> fromDump, int devicePhotos) throws IOException {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("entry", entryJson(activityId, caption, fromDump), MediaType.TEXT_PLAIN);
        for (int i = 0; i < devicePhotos; i++) {
            builder.part("photos", namedPhoto("device-" + i + ".jpg")).contentType(MediaType.IMAGE_JPEG);
        }
        return builder.build();
    }


    private static String entryJson(UUID activityId, String caption, List<UUID> fromDump) {
        String dump = fromDump.stream().map(id -> "\"" + id + "\"").reduce((a, b) -> a + "," + b).orElse("");
        String captionField = caption == null ? "null" : "\"" + caption + "\"";
        return "{\"activityId\":\"" + activityId + "\",\"caption\":" + captionField + ",\"fromDump\":[" + dump + "]}";
    }


    private Entry recaption(String token, Fixture trip, UUID entryId, String caption) {
        byte[] body =
                rig.send(
                                HttpMethod.PATCH,
                                diaryUri(trip) + "/" + entryId,
                                token,
                                "{\"caption\":\"" + caption + "\"}")
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return entryFrom(body);
    }


    private Entry addDevicePhoto(String token, Fixture trip, UUID entryId) throws IOException {
        Entry body =
                rest.post()
                        .uri(diaryUri(trip) + "/" + entryId + "/photos")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(onePhotoPart())
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody(Entry.class)
                        .returnResult()
                        .getResponseBody();
        assertThat(body).isNotNull();
        return body;
    }


    private byte[] addDevicePhotoExpecting(String token, Fixture trip, UUID entryId, int status)
            throws IOException {
        return rest.post()
                .uri(diaryUri(trip) + "/" + entryId + "/photos")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(onePhotoPart())
                .exchange()
                .expectStatus()
                .isEqualTo(status)
                .expectBody()
                .returnResult()
                .getResponseBodyContent();
    }


    private Entry addFromDump(String token, Fixture trip, UUID entryId, UUID dumpPhotoId) {
        byte[] body =
                rig.send(
                                HttpMethod.POST,
                                diaryUri(trip) + "/" + entryId + "/photos/from-dump",
                                token,
                                "{\"photoId\":\"" + dumpPhotoId + "\"}")
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return entryFrom(body);
    }


    private Entry removePhoto(String token, Fixture trip, UUID entryId, UUID photoId) {
        rig.send(HttpMethod.DELETE, diaryUri(trip) + "/" + entryId + "/photos/" + photoId, token, null)
                .expectStatus()
                .isNoContent();
        return only(mine(token, trip).stream().filter(e -> e.id().equals(entryId)).toList());
    }


    private List<Entry> mine(String token, Fixture trip) {
        return pageOf(token, trip, "").items();
    }


    private EntryPage pageOf(String token, Fixture trip, String query) {
        EntryPage body =
                rest.get()
                        .uri(diaryUri(trip) + query)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody(EntryPage.class)
                        .returnResult()
                        .getResponseBody();
        assertThat(body).isNotNull();
        return body;
    }


    private List<TripSummary> myTrips(String token, String query) {
        return myTripsPage(token, query).items();
    }


    private TripPage myTripsPage(String token, String query) {
        TripPage body =
                rest.get()
                        .uri("/v1/me/diary/trips" + query)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody(TripPage.class)
                        .returnResult()
                        .getResponseBody();
        assertThat(body).isNotNull();
        return body;
    }


    private UUID uploadToDump(String token, Fixture trip) throws IOException {
        byte[] body =
                rest.post()
                        .uri("/v1/itineraries/" + trip.tripId() + "/photo-dump")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(onePhotoPart())
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return UUID.fromString(TripRig.fieldIn(body, "id"));
    }


    private Fixture startedTrip() throws IOException {
        return startedTrip(null);
    }


    private Fixture startedTrip(String existingOwner) throws IOException {
        Fixture draft = draftTrip(existingOwner);
        advance(draft, "finish-planning");
        advance(draft, "start");
        return draft;
    }


    private Fixture draftTrip() throws IOException {
        return draftTrip(null);
    }


    private Fixture draftTrip(String existingOwner) throws IOException {
        String owner = existingOwner == null ? rig.travelerWithHandle(handle()) : existingOwner;
        String tripId = rig.createTrip(owner, 3);
        String member = rig.joinAsMember(owner, tripId, handle());
        UUID activityId =
                rig.addActivity(owner, tripId, rig.dayAt(tripId, 1), ACTIVITY_TITLE);
        return new Fixture(owner, member, tripId, activityId);
    }


    private void advance(Fixture trip, String step) {
        rest.post()
                .uri("/v1/itineraries/" + trip.tripId() + "/" + step)
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void archive(Fixture trip) {
        rest.post()
                .uri("/v1/itineraries/" + trip.tripId() + "/archive")
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void renameActivity(Fixture trip, String newTitle) {
        UUID dayId = rig.dayAt(trip.tripId(), 1);
        rig.hold(trip.owner(), trip.tripId(), "activity", trip.activityId());
        rig.send(
                        HttpMethod.PATCH,
                        TripRig.activitiesUri(trip.tripId(), dayId) + "/" + trip.activityId(),
                        trip.owner(),
                        "{\"title\":\"" + newTitle + "\"}")
                .expectStatus()
                .isOk();
        rig.releaseLease(trip.owner(), trip.tripId(), "activity", trip.activityId());
    }


    private void moveActivityToDayTwo(Fixture trip) {
        UUID from = rig.dayAt(trip.tripId(), 1);
        UUID to = rig.dayAt(trip.tripId(), 2);
        rig.hold(trip.owner(), trip.tripId(), "activity", trip.activityId());
        rig.send(
                        HttpMethod.POST,
                        TripRig.activitiesUri(trip.tripId(), from) + "/" + trip.activityId() + "/move",
                        trip.owner(),
                        "{\"targetDayId\":\"" + to + "\"}")
                .expectStatus()
                .isOk();
        rig.releaseLease(trip.owner(), trip.tripId(), "activity", trip.activityId());
    }


    private void deleteActivity(Fixture trip) {
        UUID dayId = rig.dayAt(trip.tripId(), 2);
        rig.hold(trip.owner(), trip.tripId(), "activity", trip.activityId());
        rig.send(
                        HttpMethod.DELETE,
                        TripRig.activitiesUri(trip.tripId(), dayId) + "/" + trip.activityId(),
                        trip.owner(),
                        null)
                .expectStatus()
                .isNoContent();
    }


    private byte[] bytesOf(String url, String token) {
        return rest.get()
                .uri(url)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(byte[].class)
                .returnResult()
                .getResponseBody();
    }


    private int entryCountOf(Fixture trip) {
        Integer count =
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM diary_entry WHERE itinerary_id = ?",
                        Integer.class,
                        UUID.fromString(trip.tripId()));
        return count == null ? 0 : count;
    }


    private int photosLeftFor(UUID entryId) {
        Integer count =
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM photo WHERE subject_kind = 'DIARY_ENTRY' AND subject_id = ?",
                        Integer.class,
                        entryId);
        return count == null ? 0 : count;
    }


    private static Entry entryFrom(byte[] body) {
        Entry parsed = JSON.readValue(body, Entry.class);
        assertThat(parsed).isNotNull();
        return parsed;
    }


    private static List<UUID> idsOf(Entry entry) {
        return entry.photos().stream().map(EntryPhoto::id).toList();
    }


    private static List<String> captionsOf(List<Entry> entries) {
        return entries.stream().map(Entry::caption).toList();
    }


    private static Entry only(List<Entry> entries) {
        assertThat(entries).hasSize(1);
        return entries.getFirst();
    }


    private static MultiValueMap<String, HttpEntity<?>> onePhotoPart() throws IOException {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("photo", namedPhoto("photo.jpg")).contentType(MediaType.IMAGE_JPEG);
        return builder.build();
    }


    private static ByteArrayResource namedPhoto(String filename) throws IOException {
        return new ByteArrayResource(photo()) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
    }


    private static byte[] photo() throws IOException {
        BufferedImage image = new BufferedImage(400, 300, BufferedImage.TYPE_INT_RGB);
        Graphics2D pen = image.createGraphics();
        pen.setColor(Color.GREEN);
        pen.fillRect(0, 0, 400, 300);
        pen.dispose();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(image, "jpeg", bytes);
        return bytes.toByteArray();
    }


    private static String diaryUri(Fixture trip) {
        return "/v1/itineraries/" + trip.tripId() + "/diary/entries";
    }


    private static String handle() {
        return "h" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }


    private static String bearer(String token) {
        return "Bearer " + token;
    }


    private static final String ACTIVITY_TITLE = "Sunset at Las Cabanas";

    private static final ObjectMapper JSON = new ObjectMapper();


    private record Fixture(String owner, String member, String tripId, UUID activityId) {}

    private record Entry(
            UUID id,
            UUID itineraryId,
            UUID activityId,
            String activityTitle,
            String dayLabel,
            String timeOfDay,
            String caption,
            List<EntryPhoto> photos) {}

    private record EntryPhoto(UUID id, String url, String thumbUrl) {}

    private record EntryPage(List<Entry> items, String nextCursor) {}

    private record TripSummary(
            UUID itineraryId,
            String title,
            long entryCount,
            String destination,
            int dayCount,
            String coverImageUrl) {}

    private record TripPage(List<TripSummary> items, String nextCursor) {}
}
