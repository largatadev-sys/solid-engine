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
class CoverContractIT extends ObjectStoreTestBase {

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
    void theOwnerSetsACoverUnderTheHeaderLeaseAndItLandsOnTheItinerary() throws IOException {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        holdHeaderLease(owner, trip);

        String cover = uploadCover(owner, trip);

        assertThat(cover).startsWith("/v1/media/");
    }


    @Test
    void aCoverUploadWithoutTheHeaderLeaseIsRefused() throws IOException {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);

        rest.post()
                .uri("/v1/itineraries/" + trip + "/cover")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(multipart(photo()))
                .exchange()
                .expectStatus()
                .isEqualTo(409);
    }


    @Test
    void aMemberOfThePrivateTripMayReadItsCoverAndAStrangerMayNot() throws IOException {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        String member = rig.joinAsMember(owner, trip, handle());
        String stranger = rig.travelerWithHandle(handle());
        holdHeaderLease(owner, trip);
        String cover = uploadCover(owner, trip);

        expectStatusOn(cover, member, 200);
        expectStatusOn(cover, stranger, 404);
    }


    @Test
    void aVisitorWithNoTokenIsRefusedEvenOnAPublishedTrip() throws IOException {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        holdHeaderLease(owner, trip);
        String cover = uploadCover(owner, trip);
        publish(owner, trip);

        rest.get().uri(cover).exchange().expectStatus().isUnauthorized();
    }


    @Test
    void publishingOpensTheCoverToEveryTravelerAndUnpublishingClosesItAgain() throws IOException {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        String stranger = rig.travelerWithHandle(handle());
        holdHeaderLease(owner, trip);
        String cover = uploadCover(owner, trip);

        expectStatusOn(cover, stranger, 404);

        publish(owner, trip);
        expectStatusOn(cover, stranger, 200);

        unpublish(owner, trip);
        expectStatusOn(cover, stranger, 404);
    }


    @Test
    void aPublishedTripRefusesACoverChangeBecauseTheFreezeCoversMedia() throws IOException {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        holdHeaderLease(owner, trip);
        uploadCover(owner, trip);
        publish(owner, trip);

        rest.post()
                .uri("/v1/itineraries/" + trip + "/cover")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(multipart(photo()))
                .exchange()
                .expectStatus()
                .isEqualTo(409);
    }


    @Test
    void anArchivedTripHidesItsCoverFromMembersAndKeepsItForTheOwner() throws IOException {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        String member = rig.joinAsMember(owner, trip, handle());
        holdHeaderLease(owner, trip);
        String cover = uploadCover(owner, trip);

        rest.post()
                .uri("/v1/itineraries/" + trip + "/archive")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();

        expectStatusOn(cover, owner, 200);
        expectStatusOn(cover, member, 404);
    }


    @Test
    void removingTheCoverClearsTheFieldAndTheBytes() throws IOException {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        holdHeaderLease(owner, trip);
        String cover = uploadCover(owner, trip);

        rest.delete()
                .uri("/v1/itineraries/" + trip + "/cover")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.coverImageUrl")
                .doesNotExist();

        expectStatusOn(cover, owner, 404);
    }


    @Test
    void noProviderHostnameEverReachesTheDatabase() throws IOException {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        holdHeaderLease(owner, trip);
        uploadCover(owner, trip);

        String stored =
                jdbc.queryForObject(
                        "SELECT cover_image_url FROM itinerary WHERE id = ?",
                        String.class,
                        UUID.fromString(trip));

        assertThat(stored).startsWith("/v1/media/");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM photo WHERE storage_key LIKE 'http%'", Integer.class))
                .isZero();
    }


    private void holdHeaderLease(String token, String trip) {
        rest.post()
                .uri("/v1/itineraries/" + trip + "/edit-lock")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"subjectType\":\"header\"}")
                .exchange()
                .expectStatus()
                .isOk();
    }


    private String uploadCover(String token, String trip) throws IOException {
        CoverBody body =
                rest.post()
                        .uri("/v1/itineraries/" + trip + "/cover")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(multipart(photo()))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody(CoverBody.class)
                        .returnResult()
                        .getResponseBody();
        assertThat(body).isNotNull();
        assertThat(body.coverImageUrl()).isNotNull();
        return body.coverImageUrl();
    }


    private void publish(String owner, String trip) {
        rest.post()
                .uri("/v1/itineraries/" + trip + "/finish-planning")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();
        rest.post()
                .uri("/v1/itineraries/" + trip + "/start")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();
        rest.post()
                .uri("/v1/itineraries/" + trip + "/complete")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();
        rest.post()
                .uri("/v1/itineraries/" + trip + "/publish")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void unpublish(String owner, String trip) {
        rest.post()
                .uri("/v1/itineraries/" + trip + "/unpublish")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void expectStatusOn(String mediaUrl, String token, int expected) {
        rest.get()
                .uri(mediaUrl)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isEqualTo(expected);
    }


    private record CoverBody(String coverImageUrl) {}


    private static MultiValueMap<String, HttpEntity<?>> multipart(byte[] image) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder
                .part("photo", new ByteArrayResource(image) {
                    @Override
                    public String getFilename() {
                        return "cover.jpg";
                    }
                })
                .contentType(MediaType.IMAGE_JPEG);
        return builder.build();
    }


    private static byte[] photo() throws IOException {
        BufferedImage image = new BufferedImage(600, 400, BufferedImage.TYPE_INT_RGB);
        Graphics2D pen = image.createGraphics();
        pen.setColor(Color.BLUE);
        pen.fillRect(0, 0, 600, 400);
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
