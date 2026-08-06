package com.largata.itinerary.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.itinerary.ActivityPhotoService;
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
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.springframework.util.MultiValueMap;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class ActivityPhotoContractIT extends ObjectStoreTestBase {

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
    void photosAppearOnTheActivityInUploadOrder() throws IOException {
        Fixture trip = tripWithAnActivity();
        holdActivityLease(trip);

        String first = addPhoto(trip);
        String second = addPhoto(trip);

        assertThat(photoUrlsOf(trip)).containsExactly(first, second);
    }


    @Test
    void theSixthPhotoIsRefusedWithANamedError() throws IOException {
        Fixture trip = tripWithAnActivity();
        holdActivityLease(trip);
        for (int i = 0; i < ActivityPhotoService.MAX_PHOTOS_PER_ACTIVITY; i++) {
            addPhoto(trip);
        }

        rest.post()
                .uri(photosUri(trip))
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(multipart(photo()))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("TOO_MANY_ACTIVITY_PHOTOS");
    }


    @Test
    void addingAPhotoWithoutTheActivityLeaseIsRefused() throws IOException {
        Fixture trip = tripWithAnActivity();

        rest.post()
                .uri(photosUri(trip))
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(multipart(photo()))
                .exchange()
                .expectStatus()
                .isEqualTo(409);
    }


    @Test
    void anyLeaseHoldingMemberMayManageThePhotos() throws IOException {
        Fixture trip = tripWithAnActivity();
        String member = rig.joinAsMember(trip.owner(), trip.tripId(), handle());

        acquireActivityLease(member, trip);
        String photoUrl = addPhotoAs(member, trip);

        assertThat(photoUrlsOf(trip)).contains(photoUrl);
    }


    @Test
    void deletingAPhotoRemovesItAndItsBytes() throws IOException {
        Fixture trip = tripWithAnActivity();
        holdActivityLease(trip);
        String photoUrl = addPhoto(trip);
        String photoId = photoUrl.substring(photoUrl.lastIndexOf('/') + 1);

        rest.delete()
                .uri(photosUri(trip) + "/" + photoId)
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isOk();

        assertThat(photoUrlsOf(trip)).isEmpty();
        rest.get()
                .uri(photoUrl)
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    @Test
    void aStrangerCannotReadAPrivateTripsActivityPhoto() throws IOException {
        Fixture trip = tripWithAnActivity();
        holdActivityLease(trip);
        String photoUrl = addPhoto(trip);
        String stranger = rig.travelerWithHandle(handle());

        rest.get()
                .uri(photoUrl)
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    @Test
    void thePhotosCrossToThePublishedProjectionForTheGallery() throws IOException {
        Fixture trip = tripWithAnActivity();
        holdActivityLease(trip);
        String photoUrl = addPhoto(trip);
        releaseAndPublish(trip);

        String stranger = rig.travelerWithHandle(handle());
        rest.get()
                .uri("/v1/published-itineraries/" + trip.tripId())
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.days[0].activities[0].photos[0].url")
                .isEqualTo(photoUrl);

        rest.get()
                .uri(photoUrl)
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isOk();
    }


    @Test
    void aPhotoIdFromAnotherActivityIsNotDeletableThroughThisOne() throws IOException {
        Fixture trip = tripWithAnActivity();
        holdActivityLease(trip);
        String photoUrl = addPhoto(trip);
        String photoId = photoUrl.substring(photoUrl.lastIndexOf('/') + 1);

        UUID otherActivity = rig.addActivity(trip.owner(), trip.tripId(), trip.dayId(), "Another");
        acquireLeaseOn(trip.owner(), trip.tripId(), otherActivity);

        rest.delete()
                .uri(
                        "/v1/itineraries/" + trip.tripId() + "/days/" + trip.dayId() + "/activities/"
                                + otherActivity + "/photos/" + photoId)
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    private record Fixture(String owner, String tripId, UUID dayId, UUID activityId) {}


    private Fixture tripWithAnActivity() {
        String owner = rig.travelerWithHandle(handle());
        String tripId = rig.createTrip(owner, 2);
        UUID dayId = rig.dayAt(tripId, 1);
        UUID activityId = rig.addActivity(owner, tripId, dayId, "Kayaking");
        return new Fixture(owner, tripId, dayId, activityId);
    }


    private String photosUri(Fixture trip) {
        return "/v1/itineraries/" + trip.tripId() + "/days/" + trip.dayId() + "/activities/"
                + trip.activityId() + "/photos";
    }


    private void holdActivityLease(Fixture trip) {
        acquireActivityLease(trip.owner(), trip);
    }


    private void acquireActivityLease(String token, Fixture trip) {
        acquireLeaseOn(token, trip.tripId(), trip.activityId());
    }


    private void acquireLeaseOn(String token, String tripId, UUID activityId) {
        rest.post()
                .uri("/v1/itineraries/" + tripId + "/edit-lock")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"subjectType\":\"activity\",\"subjectId\":\"" + activityId + "\"}")
                .exchange()
                .expectStatus()
                .isOk();
    }


    private String addPhoto(Fixture trip) throws IOException {
        return addPhotoAs(trip.owner(), trip);
    }


    private String addPhotoAs(String token, Fixture trip) throws IOException {
        ActivityBody body =
                rest.post()
                        .uri(photosUri(trip))
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(multipart(photo()))
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody(ActivityBody.class)
                        .returnResult()
                        .getResponseBody();
        assertThat(body).isNotNull();
        return body.photos().getLast().url();
    }


    private List<String> photoUrlsOf(Fixture trip) {
        TripBody body =
                rest.get()
                        .uri("/v1/itineraries/" + trip.tripId())
                        .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody(TripBody.class)
                        .returnResult()
                        .getResponseBody();
        assertThat(body).isNotNull();
        return body.days().stream()
                .flatMap(day -> day.activities().stream())
                .filter(activity -> activity.id().equals(trip.activityId()))
                .flatMap(activity -> activity.photos().stream())
                .map(PhotoBody::url)
                .toList();
    }


    private void releaseAndPublish(Fixture trip) {
        rest.delete()
                .uri("/v1/itineraries/" + trip.tripId() + "/edit-lock")
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .exchange();
        for (String step : List.of("finish-planning", "start", "complete", "publish")) {
            rest.post()
                    .uri("/v1/itineraries/" + trip.tripId() + "/" + step)
                    .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                    .exchange()
                    .expectStatus()
                    .isOk();
        }
    }


    private record PhotoBody(UUID id, String url, String thumbUrl) {}

    private record ActivityBody(UUID id, List<PhotoBody> photos) {}

    private record DayBody(UUID id, List<ActivityBody> activities) {}

    private record TripBody(UUID id, List<DayBody> days) {}


    private static MultiValueMap<String, HttpEntity<?>> multipart(byte[] image) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder
                .part("photo", new ByteArrayResource(image) {
                    @Override
                    public String getFilename() {
                        return "activity.jpg";
                    }
                })
                .contentType(MediaType.IMAGE_JPEG);
        return builder.build();
    }


    private static byte[] photo() throws IOException {
        BufferedImage image = new BufferedImage(500, 400, BufferedImage.TYPE_INT_RGB);
        Graphics2D pen = image.createGraphics();
        pen.setColor(Color.GREEN);
        pen.fillRect(0, 0, 500, 400);
        pen.dispose();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(image, "jpeg", bytes);
        return bytes.toByteArray();
    }


    private static String handle() {
        return "h" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }


    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
