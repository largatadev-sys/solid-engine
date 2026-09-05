package com.largata.postcard.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.ObjectStoreTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.UUID;
import javax.imageio.ImageIO;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class TripDerivedPostcardContractIT extends ObjectStoreTestBase {

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
    void aMemberPostsFromAPlanActivityAndTheTripDiaryAutoMints() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        UUID activity = rig.addActivity(owner, trip, rig.dayAt(trip, 1), "Sunrise hike");
        String member = rig.joinAsMember(owner, trip, handle());
        start(owner, trip);

        byte[] created =
                rest.post()
                        .uri(postUri(trip, activity))
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(member))
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(parts("{\"caption\":\"Made it up\"}", 1))
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .jsonPath("$.tripId")
                        .isEqualTo(trip)
                        .jsonPath("$.activityId")
                        .isEqualTo(activity.toString())
                        .jsonPath("$.activityTitle")
                        .isEqualTo("Sunrise hike")
                        .jsonPath("$.dayLabel")
                        .isEqualTo("Day 1")
                        .jsonPath("$.diaryId")
                        .exists()
                        .returnResult()
                        .getResponseBodyContent();
        String diaryId = TripRig.fieldIn(created, "diaryId");

        rest.get()
                .uri("/v1/diaries/" + diaryId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(member))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.tripId")
                .isEqualTo(trip)
                .jsonPath("$.title")
                .isEqualTo("Trip");

        UUID secondActivity = rig.addActivity(owner, trip, rig.dayAt(trip, 2), "Night swim");
        String reused =
                TripRig.fieldIn(
                        rest.post()
                                .uri(postUri(trip, secondActivity))
                                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(member))
                                .contentType(MediaType.MULTIPART_FORM_DATA)
                                .body(parts("{\"caption\":\"Cooled off\"}", 1))
                                .exchange()
                                .expectStatus()
                                .isCreated()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent(),
                        "diaryId");
        assertThat(reused).as("later posts reuse the minted trip diary").isEqualTo(diaryId);
    }


    @Test
    void aSecondPostcardFromTheSameActivityIsRefusedByNameButAnotherMemberPostsFreely() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        UUID activity = rig.addActivity(owner, trip, rig.dayAt(trip, 1), "Reef dive");
        String member = rig.joinAsMember(owner, trip, handle());
        start(owner, trip);
        post(member, trip, activity, "{\"caption\":\"First telling\"}");

        rest.post()
                .uri(postUri(trip, activity))
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(member))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(parts("{\"caption\":\"Second telling\"}", 1))
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ACTIVITY_ALREADY_POSTCARDED");

        post(owner, trip, activity, "{\"caption\":\"The owner's own telling\"}");
    }


    @Test
    void deletingTheTripDiaryThenPostingAgainRemintsIt() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        UUID activity = rig.addActivity(owner, trip, rig.dayAt(trip, 1), "Old town walk");
        start(owner, trip);
        String firstDiary = TripRig.fieldIn(post(owner, trip, activity, "{}"), "diaryId");

        rest.delete()
                .uri("/v1/diaries/" + firstDiary)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isNoContent();

        String secondDiary = TripRig.fieldIn(post(owner, trip, activity, "{}"), "diaryId");
        assertThat(secondDiary).as("the next post re-mints a fresh trip diary").isNotEqualTo(firstDiary);
    }


    @Test
    void postingBeforeTheTripStartsIsRefusedByName() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        UUID activity = rig.addActivity(owner, trip, rig.dayAt(trip, 1), "Too soon");

        rest.post()
                .uri(postUri(trip, activity))
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(parts("{}", 1))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("TRIP_NOT_STARTED");
    }


    @Test
    void anActivityOutsideTheTripAnswersNotFound() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        start(owner, trip);
        String otherOwner = rig.travelerWithHandle(handle());
        String otherTrip = rig.createTrip(otherOwner, 1);
        UUID foreignActivity =
                rig.addActivity(otherOwner, otherTrip, rig.dayAt(otherTrip, 1), "Not yours");

        rest.post()
                .uri(postUri(trip, foreignActivity))
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(parts("{}", 1))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ACTIVITY_NOT_FOUND");
    }


    @Test
    void deletingThePlanActivityLeavesTheDanglingProvenanceAndReadsTolerateIt() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        UUID day = rig.dayAt(trip, 1);
        UUID activity = rig.addActivity(owner, trip, day, "Vanishing act");
        start(owner, trip);
        String postcardId = TripRig.fieldIn(post(owner, trip, activity, "{\"caption\":\"Kept\"}"), "id");

        rig.hold(owner, trip, "ACTIVITY", activity);
        rest.delete()
                .uri(TripRig.activitiesUri(trip, day) + "/" + activity)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isNoContent();

        rest.get()
                .uri("/v1/postcards/" + postcardId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.activityId")
                .isEqualTo(activity.toString())
                .jsonPath("$.activityTitle")
                .isEqualTo("Vanishing act")
                .jsonPath("$.caption")
                .isEqualTo("Kept");
    }


    @Test
    void onAnArchivedTripWithdrawalCrossesTheFreezeButRecaptionRespectsIt() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        UUID activity = rig.addActivity(owner, trip, rig.dayAt(trip, 1), "Frozen memory");
        String member = rig.joinAsMember(owner, trip, handle());
        start(owner, trip);
        String postcardId = TripRig.fieldIn(post(member, trip, activity, "{\"caption\":\"Before\"}"), "id");
        rest.post()
                .uri("/v1/itineraries/" + trip + "/archive")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();

        rest.patch()
                .uri("/v1/postcards/" + postcardId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(member))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"caption\":\"After\"}")
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("TRIP_ARCHIVED");
        rest.delete()
                .uri("/v1/postcards/" + postcardId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(member))
                .exchange()
                .expectStatus()
                .isNoContent();
    }


    @Test
    void aMemberWhoLeftTheTripStillDeletesTheirOwnPostcard() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        UUID activity = rig.addActivity(owner, trip, rig.dayAt(trip, 1), "Posted then parted");
        String member = rig.joinAsMember(owner, trip, handle());
        start(owner, trip);
        String postcardId = TripRig.fieldIn(post(member, trip, activity, "{}"), "id");
        UUID memberId = rig.travelerIdOf(member);

        rest.delete()
                .uri("/v1/itineraries/" + trip + "/members/" + memberId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isNoContent();

        rest.delete()
                .uri("/v1/postcards/" + postcardId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(member))
                .exchange()
                .expectStatus()
                .isNoContent();
    }


    private byte[] post(String token, String trip, UUID activity, String postcardJson) {
        return rest.post()
                .uri(postUri(trip, activity))
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(parts(postcardJson, 1))
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .returnResult()
                .getResponseBodyContent();
    }


    private void start(String owner, String trip) {
        rest.post()
                .uri("/v1/itineraries/" + trip + "/start")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private static String postUri(String trip, UUID activity) {
        return "/v1/trips/" + trip + "/activities/" + activity + "/postcards";
    }


    private static org.springframework.util.MultiValueMap<String, org.springframework.http.HttpEntity<?>>
            parts(String postcardJson, int photoCount) {
        MultipartBodyBuilder parts = new MultipartBodyBuilder();
        parts.part("postcard", postcardJson).contentType(MediaType.APPLICATION_JSON);
        for (int ordinal = 0; ordinal < photoCount; ordinal++) {
            String filename = "moment-" + ordinal + ".jpg";
            parts.part("photos", new ByteArrayResource(jpeg()) {
                        @Override
                        public String getFilename() {
                            return filename;
                        }
                    })
                    .contentType(MediaType.IMAGE_JPEG);
        }
        return parts.build();
    }


    private static byte[] jpeg() {
        BufferedImage photo = new BufferedImage(320, 240, BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < photo.getHeight(); y++) {
            for (int x = 0; x < photo.getWidth(); x++) {
                photo.setRGB(x, y, (x * 17 + y * 3) & 0xFFFFFF);
            }
        }
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try {
            ImageIO.write(photo, "jpg", bytes);
        } catch (IOException unwritable) {
            throw new UncheckedIOException(unwritable);
        }
        return bytes.toByteArray();
    }


    private static String handle() {
        return "t" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }


    @Test
    void aPinnedActivitysPostcardCarriesThePinInItsSnapshotAndAnUnpinnedOneCarriesNone() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        UUID pinned = rig.addActivity(owner, trip, rig.dayAt(trip, 1), "Lagoon");
        UUID bare = rig.addActivity(owner, trip, rig.dayAt(trip, 1), "Nap");
        jdbc.update(
                "UPDATE activity SET place = 'Big Lagoon', latitude = 11.194900, longitude = 119.401300,"
                        + " zoom = 15 WHERE id = ?",
                pinned);
        start(owner, trip);

        rest.post()
                .uri(postUri(trip, pinned))
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(parts("{\"caption\":\"Blue all the way down\"}", 1))
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.pin.zoom")
                .isEqualTo(15)
                .jsonPath("$.pin.lat")
                .exists()
                .jsonPath("$.pin.lng")
                .exists();
        assertThat(jdbc.queryForObject("SELECT latitude FROM postcard WHERE activity_id = ?", BigDecimal.class, pinned))
                .isEqualByComparingTo(new BigDecimal("11.1949"));
        assertThat(jdbc.queryForObject("SELECT longitude FROM postcard WHERE activity_id = ?", BigDecimal.class, pinned))
                .isEqualByComparingTo(new BigDecimal("119.4013"));

        rest.post()
                .uri(postUri(trip, bare))
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(parts("{\"caption\":\"Nothing to pin\"}", 1))
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.pin")
                .doesNotExist();
    }
}
