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
import java.nio.charset.StandardCharsets;
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
class PhotoDumpContractIT extends ObjectStoreTestBase {

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
    void everyMembersPhotoLandsInOnePoolInUploadOrder() throws IOException {
        Fixture trip = tripWithAMember();

        DumpPhoto fromOwner = upload(trip.owner(), trip);
        DumpPhoto fromMember = upload(trip.member(), trip);

        assertThat(idsIn(listAs(trip.member(), trip)))
                .as("both members see one shared pool, oldest first")
                .containsExactly(fromOwner.id(), fromMember.id());
    }


    @Test
    void anUploadAnswersWithThePhotoItsUrlsAndItsUploader() throws IOException {
        Fixture trip = tripWithAMember();

        DumpPhoto uploaded = upload(trip.member(), trip);

        assertThat(uploaded.url()).isEqualTo("/v1/media/" + uploaded.id());
        assertThat(uploaded.thumbUrl()).isEqualTo("/v1/media/" + uploaded.id() + "/thumb");
        assertThat(uploaded.uploadedBy()).isEqualTo(rig.travelerIdOf(trip.member()));
        assertThat(uploaded.createdAt()).isNotNull();
    }


    @Test
    void bothVariantsServeToAMemberAndTheThumbIsTheSmallerOne() throws IOException {
        Fixture trip = tripWithAMember();
        DumpPhoto photo = upload(trip.owner(), trip);

        byte[] display = bytesOf(photo.url(), trip.member());
        byte[] thumb = bytesOf(photo.thumbUrl(), trip.member());

        assertThat(display).isNotEmpty();
        assertThat(thumb).isNotEmpty();
        assertThat(thumb.length).isLessThan(display.length);
    }


    @Test
    void aDumpPhotoCarriesNoEmbeddedMetadataOutOfIngest() throws IOException {
        Fixture trip = tripWithAMember();
        byte[] tagged = photoCarryingExifGps();
        assertThat(indexOf(tagged, GPS_SENTINEL)).as("the fixture must actually carry EXIF").isNotEqualTo(-1);

        DumpPhoto photo = uploadBytes(trip.owner(), trip, tagged);

        assertThat(indexOf(bytesOf(photo.url(), trip.owner()), GPS_SENTINEL))
                .as("INV-11: the GPS bytes never survive re-encoding")
                .isEqualTo(-1);
        assertThat(indexOf(bytesOf(photo.thumbUrl(), trip.owner()), GPS_SENTINEL))
                .isEqualTo(-1);
        assertThat(indexOf(bytesOf(photo.url(), trip.owner()), EXIF_HEADER)).isEqualTo(-1);
    }


    @Test
    void aNonMemberIsMaskedOnListUploadAndDelete() throws IOException {
        Fixture trip = tripWithAMember();
        DumpPhoto photo = upload(trip.owner(), trip);
        String stranger = rig.travelerWithHandle(handle());

        rest.get()
                .uri(dumpUri(trip))
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound();

        rest.post()
                .uri(dumpUri(trip))
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(multipart(photo()))
                .exchange()
                .expectStatus()
                .isNotFound();

        rest.delete()
                .uri(dumpUri(trip) + "/" + photo.id())
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    @Test
    void aNonMembersMediaReadOfADumpPhotoIsMaskedWhileAMembersIsServed() throws IOException {
        Fixture trip = tripWithAMember();
        DumpPhoto photo = upload(trip.owner(), trip);
        String stranger = rig.travelerWithHandle(handle());

        rest.get()
                .uri(photo.url())
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound();

        rest.get()
                .uri(photo.url())
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.member()))
                .exchange()
                .expectStatus()
                .isOk();
    }


    @Test
    void publishingNeverOpensThePoolToTravellersOutsideTheTrip() throws IOException {
        Fixture trip = tripWithAMember();
        DumpPhoto photo = upload(trip.owner(), trip);
        publish(trip);
        String stranger = rig.travelerWithHandle(handle());

        rest.get()
                .uri(photo.url())
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound();

        rest.get()
                .uri(dumpUri(trip))
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    @Test
    void anUploaderTakesTheirOwnPhotoOutAndItsBytesGoWithIt() throws IOException {
        Fixture trip = tripWithAMember();
        DumpPhoto photo = upload(trip.member(), trip);

        deleteAs(trip.member(), trip, photo);

        assertThat(idsIn(listAs(trip.member(), trip))).isEmpty();
        rest.get()
                .uri(photo.url())
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isNotFound();
        rest.get()
                .uri(photo.thumbUrl())
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    @Test
    void theOwnerTakesOutAnyonesPhoto() throws IOException {
        Fixture trip = tripWithAMember();
        DumpPhoto theirs = upload(trip.member(), trip);

        deleteAs(trip.owner(), trip, theirs);

        assertThat(idsIn(listAs(trip.member(), trip))).isEmpty();
    }


    @Test
    void aMemberDeletingAnotherMembersPhotoIsRefusedByName() throws IOException {
        Fixture trip = tripWithAMember();
        DumpPhoto ownersPhoto = upload(trip.owner(), trip);

        rest.delete()
                .uri(dumpUri(trip) + "/" + ownersPhoto.id())
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.member()))
                .exchange()
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");

        assertThat(idsIn(listAs(trip.owner(), trip))).containsExactly(ownersPhoto.id());
    }


    @Test
    void authorityIsAnsweredBeforeTheArchiveFence() throws IOException {
        Fixture trip = tripWithAMember();
        DumpPhoto ownersPhoto = upload(trip.owner(), trip);
        archive(trip);

        rest.delete()
                .uri(dumpUri(trip) + "/" + ownersPhoto.id())
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.member()))
                .exchange()
                .expectStatus()
                .isForbidden();
    }


    @Test
    void aPublishedTripStillTakesPhotosBecauseTheFreezeIsThePlan() throws IOException {
        Fixture trip = tripWithAMember();
        publish(trip);

        DumpPhoto afterPublish = upload(trip.member(), trip);

        assertThat(idsIn(listAs(trip.owner(), trip)))
                .as("the dump hangs off the workspace, not the plan the freeze protects")
                .containsExactly(afterPublish.id());
    }


    @Test
    void anArchivedTripRefusesUploadAndDeleteWhileTheOwnerStillReadsThePool() throws IOException {
        Fixture trip = tripWithAMember();
        DumpPhoto photo = upload(trip.owner(), trip);
        archive(trip);

        rest.post()
                .uri(dumpUri(trip))
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(multipart(photo()))
                .exchange()
                .expectStatus()
                .isEqualTo(409);

        rest.delete()
                .uri(dumpUri(trip) + "/" + photo.id())
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isEqualTo(409);

        assertThat(idsIn(listAs(trip.owner(), trip)))
                .as("archive narrows the audience to the owner — it does not hide the pool from them")
                .containsExactly(photo.id());
    }


    @Test
    void anArchivedTripsPoolIsMaskedFromAMemberWhoIsNotTheOwner() throws IOException {
        Fixture trip = tripWithAMember();
        DumpPhoto photo = upload(trip.owner(), trip);
        archive(trip);

        rest.get()
                .uri(dumpUri(trip))
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.member()))
                .exchange()
                .expectStatus()
                .isNotFound();

        rest.get()
                .uri(photo.url())
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.member()))
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    @Test
    void aPhotoFromAnotherTripsPoolIsNotDeletableThroughThisOne() throws IOException {
        Fixture trip = tripWithAMember();
        Fixture other = tripWithAMember();
        DumpPhoto elsewhere = upload(other.owner(), other);

        rest.delete()
                .uri(dumpUri(trip) + "/" + elsewhere.id())
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isNotFound();

        assertThat(idsIn(listAs(other.owner(), other))).containsExactly(elsewhere.id());
    }


    @Test
    void theTripsOwnActivityPhotosAndCoverStayOutOfThePool() throws IOException {
        Fixture trip = tripWithAMember();
        DumpPhoto dumped = upload(trip.owner(), trip);
        addAnActivityPhoto(trip);
        addACover(trip);

        assertThat(idsIn(listAs(trip.owner(), trip)))
                .as("the dump is uploads only — it never shows plan media keyed to the same trip")
                .containsExactly(dumped.id());
    }


    @Test
    void anAvatarIsNotDeletableThroughTheDumpCollection() throws IOException {
        Fixture trip = tripWithAMember();
        UUID avatarId = avatarPhotoIdOf(trip.owner());

        rest.delete()
                .uri(dumpUri(trip) + "/" + avatarId)
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    @Test
    void thePoolPagesInTheStandardCursorShapeInUploadOrder() throws IOException {
        Fixture trip = tripWithAMember();
        DumpPhoto first = upload(trip.owner(), trip);
        DumpPhoto second = upload(trip.owner(), trip);
        DumpPhoto third = upload(trip.member(), trip);

        DumpPage firstPage = pageOf(trip.owner(), trip, "?limit=2");
        assertThat(idsIn(firstPage)).containsExactly(first.id(), second.id());
        assertThat(firstPage.nextCursor()).isNotNull();

        DumpPage secondPage = pageOf(trip.owner(), trip, "?limit=2&cursor=" + firstPage.nextCursor());
        assertThat(idsIn(secondPage)).containsExactly(third.id());
        assertThat(secondPage.nextCursor()).isNull();
    }


    @Test
    void dumpWritesAreWorkspaceActsSoThePlanNeverMoves() throws IOException {
        Fixture trip = tripWithAMember();
        long planVersion = rig.planVersionOf(trip.owner(), trip.tripId());
        List<String> historyBefore = rig.historyActs(trip.tripId());

        DumpPhoto photo = upload(trip.member(), trip);
        deleteAs(trip.member(), trip, photo);

        assertThat(rig.planVersionOf(trip.owner(), trip.tripId()))
                .as("no planVersion bump — the dump is not plan data")
                .isEqualTo(planVersion);
        assertThat(rig.historyActs(trip.tripId()))
                .as("no activity-history entry either")
                .isEqualTo(historyBefore);
    }


    @Test
    void aPhotoIsUploadableWithNoEditingSessionHeldByAnyone() throws IOException {
        Fixture trip = tripWithAMember();
        rig.hold(trip.owner(), trip.tripId(), "session", UUID.fromString(trip.tripId()));

        DumpPhoto photo = upload(trip.member(), trip);

        assertThat(idsIn(listAs(trip.owner(), trip)))
                .as("another traveler's Editing Session never blocks the pool")
                .containsExactly(photo.id());
    }


    @Test
    void somethingThatIsNotAnImageIsRefused() {
        Fixture trip = tripWithAMember();

        rest.post()
                .uri(dumpUri(trip))
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(multipart("<html>not a photo</html>".getBytes(StandardCharsets.UTF_8)))
                .exchange()
                .expectStatus()
                .isBadRequest();
    }


    private record Fixture(String owner, String member, String tripId) {}

    private record DumpPhoto(UUID id, String url, String thumbUrl, UUID uploadedBy, String createdAt) {}

    private record DumpPage(List<DumpPhoto> items, String nextCursor) {}


    private Fixture tripWithAMember() {
        String owner = rig.travelerWithHandle(handle());
        String tripId = rig.createTrip(owner, 2);
        String member = rig.joinAsMember(owner, tripId, handle());
        return new Fixture(owner, member, tripId);
    }


    private String dumpUri(Fixture trip) {
        return "/v1/itineraries/" + trip.tripId() + "/photo-dump";
    }


    private DumpPhoto upload(String token, Fixture trip) throws IOException {
        return uploadBytes(token, trip, photo());
    }


    private DumpPhoto uploadBytes(String token, Fixture trip, byte[] bytes) {
        DumpPhoto body =
                rest.post()
                        .uri(dumpUri(trip))
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(multipart(bytes))
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody(DumpPhoto.class)
                        .returnResult()
                        .getResponseBody();
        assertThat(body).isNotNull();
        return body;
    }


    private void deleteAs(String token, Fixture trip, DumpPhoto photo) {
        rest.delete()
                .uri(dumpUri(trip) + "/" + photo.id())
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isNoContent();
    }


    private DumpPage listAs(String token, Fixture trip) {
        return pageOf(token, trip, "");
    }


    private DumpPage pageOf(String token, Fixture trip, String query) {
        DumpPage body =
                rest.get()
                        .uri(dumpUri(trip) + query)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody(DumpPage.class)
                        .returnResult()
                        .getResponseBody();
        assertThat(body).isNotNull();
        return body;
    }


    private static List<UUID> idsIn(DumpPage page) {
        return page.items().stream().map(DumpPhoto::id).toList();
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


    private UUID avatarPhotoIdOf(String token) throws IOException {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder
                .part("photo", new ByteArrayResource(photo()) {
                    @Override
                    public String getFilename() {
                        return "avatar.jpg";
                    }
                })
                .contentType(MediaType.IMAGE_JPEG);
        rest.post()
                .uri("/v1/me/avatar")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(builder.build())
                .exchange()
                .expectStatus()
                .isOk();
        return jdbc.queryForObject(
                "SELECT id FROM photo WHERE subject_kind = 'TRAVELER_AVATAR' ORDER BY created_at DESC LIMIT 1",
                UUID.class);
    }


    private void addAnActivityPhoto(Fixture trip) throws IOException {
        UUID dayId = rig.dayAt(trip.tripId(), 1);
        UUID activityId = rig.addActivity(trip.owner(), trip.tripId(), dayId, "Kayaking");
        rig.hold(trip.owner(), trip.tripId(), "activity", activityId);
        rest.post()
                .uri("/v1/itineraries/" + trip.tripId() + "/days/" + dayId + "/activities/" + activityId
                        + "/photos")
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(multipart(photo()))
                .exchange()
                .expectStatus()
                .isCreated();
    }


    private void addACover(Fixture trip) throws IOException {
        rig.hold(trip.owner(), trip.tripId(), "header", UUID.fromString(trip.tripId()));
        rest.post()
                .uri("/v1/itineraries/" + trip.tripId() + "/cover")
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(multipart(photo()))
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


    private void publish(Fixture trip) {
        for (String step : List.of("finish-planning", "start", "complete", "publish")) {
            rest.post()
                    .uri("/v1/itineraries/" + trip.tripId() + "/" + step)
                    .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                    .exchange()
                    .expectStatus()
                    .isOk();
        }
    }


    private static MultiValueMap<String, HttpEntity<?>> multipart(byte[] image) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder
                .part("photo", new ByteArrayResource(image) {
                    @Override
                    public String getFilename() {
                        return "dump.jpg";
                    }
                })
                .contentType(MediaType.IMAGE_JPEG);
        return builder.build();
    }


    private static byte[] photo() throws IOException {
        BufferedImage image = new BufferedImage(500, 400, BufferedImage.TYPE_INT_RGB);
        Graphics2D pen = image.createGraphics();
        pen.setColor(Color.BLUE);
        pen.fillRect(0, 0, 500, 400);
        pen.dispose();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(image, "jpeg", bytes);
        return bytes.toByteArray();
    }


    private static byte[] photoCarryingExifGps() throws IOException {
        byte[] plain = photo();
        byte[] payload = new byte[EXIF_HEADER.length + GPS_SENTINEL.length];
        System.arraycopy(EXIF_HEADER, 0, payload, 0, EXIF_HEADER.length);
        System.arraycopy(GPS_SENTINEL, 0, payload, EXIF_HEADER.length, GPS_SENTINEL.length);

        ByteArrayOutputStream withExif = new ByteArrayOutputStream();
        withExif.write(plain, 0, 2);
        withExif.write(0xFF);
        withExif.write(0xE1);
        int segmentLength = payload.length + 2;
        withExif.write((segmentLength >> 8) & 0xFF);
        withExif.write(segmentLength & 0xFF);
        withExif.write(payload);
        withExif.write(plain, 2, plain.length - 2);
        return withExif.toByteArray();
    }


    private static int indexOf(byte[] haystack, byte[] needle) {
        outer:
        for (int i = 0; i <= haystack.length - needle.length; i++) {
            for (int j = 0; j < needle.length; j++) {
                if (haystack[i + j] != needle[j]) {
                    continue outer;
                }
            }
            return i;
        }
        return -1;
    }


    private static final byte[] GPS_SENTINEL =
            "LARGATA-DUMP-COORDS".getBytes(StandardCharsets.US_ASCII);

    private static final byte[] EXIF_HEADER = {'E', 'x', 'i', 'f', 0, 0};

    private static String handle() {
        return "h" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }


    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
