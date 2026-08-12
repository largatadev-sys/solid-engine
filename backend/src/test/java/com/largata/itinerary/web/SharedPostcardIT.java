package com.largata.itinerary.web;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.largata.support.ObjectStoreTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.ObjectMapper;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class SharedPostcardIT extends ObjectStoreTestBase {

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
    void aPostcardIsBornPrivate() throws IOException {
        Fixture trip = startedTrip();

        Entry posted = post(trip.owner(), trip, trip.activityId(), "just for me", 1, false);

        assertThat(posted.sharedAt())
                .as("default private — the share is a deliberate act, never a side effect of posting")
                .isNull();
    }


    @Test
    void theShareFlipsTheDiscriminatingMediaPair() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        Entry shared = post(trip.owner(), trip, trip.activityId(), "the shared one", 1, false);
        Entry stayedPrivate = post(trip.owner(), trip, secondActivity(trip), "the private one", 1, false);

        assertThat(mediaStatusFor(photoOf(shared), stranger))
                .as("before the share a stranger is masked")
                .isEqualTo(404);

        share(trip.owner(), trip, shared.id());

        assertThat(mediaStatusFor(photoOf(shared), stranger))
                .as("after the share the same GET serves any authenticated traveler")
                .isEqualTo(200);
        assertThat(mediaStatusFor(photoOf(stayedPrivate), stranger))
                .as("the widening is per entry — an unshared sibling still masks")
                .isEqualTo(404);
    }


    @Test
    void unshareRestoresTheMask() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        Entry entry = post(trip.owner(), trip, trip.activityId(), "briefly public", 1, true);
        assertThat(mediaStatusFor(photoOf(entry), stranger)).isEqualTo(200);

        Entry unshared = unshare(trip.owner(), trip, entry.id());

        assertThat(unshared.sharedAt()).isNull();
        assertThat(mediaStatusFor(photoOf(entry), stranger))
                .as("a privacy retraction is symmetric — the stranger is masked again")
                .isEqualTo(404);
    }


    @Test
    void sharingAnEntryThatCarriesACoTravelersDumpPhotoSucceeds() throws IOException {
        Fixture trip = startedTrip();
        UUID theMembersPhoto = uploadToDump(trip.member(), trip);
        Entry built = post(trip.owner(), trip, trip.activityId(), "built from the pool", 0, false, theMembersPhoto);

        Entry shared = share(trip.owner(), trip, built.id());

        assertThat(shared.sharedAt())
                .as("dump contribution implies consent to co-travelers' postcards, shared included — "
                        + "ADR-025 decision 2; any future tightening breaks this test on purpose")
                .isNotNull();
        String stranger = rig.travelerWithHandle(handle());
        assertThat(mediaStatusFor(photoOf(shared), stranger))
                .as("and the copied bytes serve the world with it")
                .isEqualTo(200);
    }


    @Test
    void onlyTheAuthorSharesOrUnshares() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        Entry entry = post(trip.owner(), trip, trip.activityId(), "mine alone", 1, false);

        rig.send(HttpMethod.POST, shareUri(trip, entry.id()), trip.member(), null)
                .expectStatus()
                .isNotFound();
        rig.send(HttpMethod.POST, shareUri(trip, entry.id()), stranger, null)
                .expectStatus()
                .isNotFound();

        assertThat(sharedAtOf(entry.id())).as("neither attempt moved anything").isNull();

        share(trip.owner(), trip, entry.id());
        rig.send(HttpMethod.DELETE, shareUri(trip, entry.id()), trip.member(), null)
                .expectStatus()
                .isNotFound();
        assertThat(sharedAtOf(entry.id())).as("nor can a co-member pull it back down").isNotNull();
    }


    @Test
    void theArchiveFenceRefusesBothActsWhileTheEntryStaysAuthorReadable() throws IOException {
        Fixture trip = startedTrip();
        Entry entry = post(trip.owner(), trip, trip.activityId(), "before the archive", 1, false);
        archive(trip);

        rig.send(HttpMethod.POST, shareUri(trip, entry.id()), trip.owner(), null)
                .expectStatus()
                .isEqualTo(409);
        rig.send(HttpMethod.DELETE, shareUri(trip, entry.id()), trip.owner(), null)
                .expectStatus()
                .isEqualTo(409);

        assertThat(sharedAtOf(entry.id())).isNull();
        rest.get()
                .uri(diaryUri(trip) + "/" + entry.id())
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isOk();
    }


    @Test
    void resharingKeepsTheOriginalInstantSoItDoesNotJumpTheFeed() throws IOException {
        Fixture trip = startedTrip();
        Entry entry = post(trip.owner(), trip, trip.activityId(), "shared twice", 1, false);

        share(trip.owner(), trip, entry.id());
        Instant first = sharedAtOf(entry.id());
        share(trip.owner(), trip, entry.id());

        assertThat(sharedAtOf(entry.id()))
                .as("sharing an already-shared entry is idempotent — a double tap must not re-rank it")
                .isEqualTo(first);
    }


    @Test
    void deletingASharedEntryTakesItsRowsAndItsBytes() throws IOException {
        Fixture trip = startedTrip();
        Entry entry = post(trip.owner(), trip, trip.activityId(), "here then gone", 1, true);
        UUID photoId = photoOf(entry);

        rest.delete()
                .uri(diaryUri(trip) + "/" + entry.id())
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isNoContent();

        assertThat(sharedAtOf(entry.id())).as("the row is gone, sharing and all").isNull();
        assertThat(rowCountOf(entry.id())).isZero();
        String stranger = rig.travelerWithHandle(handle());
        assertThat(mediaStatusFor(photoId, stranger))
                .as("delete means gone everywhere — the shared bytes go with it")
                .isEqualTo(404);
    }


    @Test
    void aPostWithNoActivityIsRefusedRatherThanExploding() throws IOException {
        Fixture trip = startedTrip();

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part(
                "entry",
                "{\"activityId\":null,\"caption\":\"nowhere\",\"fromDump\":[],\"shareToFeed\":false}",
                MediaType.TEXT_PLAIN);
        builder.part("photos", namedPhoto("device.jpg")).contentType(MediaType.IMAGE_JPEG);

        rest.post()
                .uri(diaryUri(trip))
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(builder.build())
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    @Test
    void aPostcardPostedWithTheToggleOnIsSharedTheMomentItExists() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());

        Entry posted = post(trip.owner(), trip, trip.activityId(), "public from birth", 1, true);

        assertThat(posted.sharedAt()).isNotNull();
        assertThat(mediaStatusFor(photoOf(posted), stranger)).isEqualTo(200);
    }


    @Test
    void shareAndUnshareEachEmitTheirRegisterTwoEvent() throws IOException {
        Fixture trip = startedTrip();
        Entry entry = post(trip.owner(), trip, trip.activityId(), "watched by telemetry", 1, false);

        ListAppender<ILoggingEvent> events = listeningToAnalytics();
        try {
            share(trip.owner(), trip, entry.id());
            unshare(trip.owner(), trip, entry.id());
        } finally {
            analyticsLogger().detachAppender(events);
        }

        assertThat(eventsNamed(events, "diary_entry_shared"))
                .singleElement()
                .satisfies(
                        line ->
                                assertThat(line.getMDCPropertyMap())
                                        .containsEntry("event.diaryEntryId", entry.id().toString())
                                        .containsKey("event.itineraryId")
                                        .containsKey("event.travelerId"));
        assertThat(eventsNamed(events, "diary_entry_unshared")).hasSize(1);
    }


    @Test
    void postingWithTheToggleOnEmitsBothTheCreationAndTheShare() throws IOException {
        Fixture trip = startedTrip();

        ListAppender<ILoggingEvent> events = listeningToAnalytics();
        try {
            post(trip.owner(), trip, trip.activityId(), "born public", 1, true);
        } finally {
            analyticsLogger().detachAppender(events);
        }

        assertThat(eventsNamed(events, "diary_entry_created")).hasSize(1);
        assertThat(eventsNamed(events, "diary_entry_shared"))
                .as("a postcard born shared is both acts, and the funnel must see both")
                .hasSize(1);
    }


    private ListAppender<ILoggingEvent> listeningToAnalytics() {
        ListAppender<ILoggingEvent> events = new ListAppender<>();
        events.start();
        analyticsLogger().addAppender(events);
        return events;
    }


    private static List<ILoggingEvent> eventsNamed(ListAppender<ILoggingEvent> events, String name) {
        return events.list.stream()
                .filter(line -> line.getFormattedMessage().equals("event=" + name))
                .toList();
    }


    private static Logger analyticsLogger() {
        return (Logger) LoggerFactory.getLogger("com.largata.analytics");
    }


    private Entry share(String token, Fixture trip, UUID entryId) {
        return entryFrom(
                rig.send(HttpMethod.POST, shareUri(trip, entryId), token, null)
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent());
    }


    private Entry unshare(String token, Fixture trip, UUID entryId) {
        return entryFrom(
                rig.send(HttpMethod.DELETE, shareUri(trip, entryId), token, null)
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent());
    }


    private int mediaStatusFor(UUID photoId, String token) {
        return rest.get()
                .uri("/v1/media/" + photoId)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .returnResult(byte[].class)
                .getStatus()
                .value();
    }


    private Instant sharedAtOf(UUID entryId) {
        List<Instant> found =
                jdbc.query(
                        "SELECT shared_at FROM diary_entry WHERE id = ?",
                        (row, index) -> {
                            java.sql.Timestamp stamp = row.getTimestamp("shared_at");
                            return stamp == null ? null : stamp.toInstant();
                        },
                        entryId);
        return found.isEmpty() ? null : found.getFirst();
    }


    private int rowCountOf(UUID entryId) {
        Integer count =
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM diary_entry WHERE id = ?", Integer.class, entryId);
        return count == null ? 0 : count;
    }


    private UUID secondActivity(Fixture trip) {
        return rig.addActivity(trip.owner(), trip.tripId(), rig.dayAt(trip.tripId(), 2), "A second stop");
    }


    private Entry post(
            String token, Fixture trip, UUID activityId, String caption, int devicePhotos, boolean shareToFeed)
            throws IOException {
        return post(token, trip, activityId, caption, devicePhotos, shareToFeed, null);
    }


    private Entry post(
            String token,
            Fixture trip,
            UUID activityId,
            String caption,
            int devicePhotos,
            boolean shareToFeed,
            UUID fromDump)
            throws IOException {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part(
                "entry",
                entryJson(activityId, caption, fromDump, shareToFeed),
                MediaType.TEXT_PLAIN);
        for (int i = 0; i < devicePhotos; i++) {
            builder.part("photos", namedPhoto("device-" + i + ".jpg")).contentType(MediaType.IMAGE_JPEG);
        }
        Entry body =
                rest.post()
                        .uri(diaryUri(trip))
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(builder.build())
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody(Entry.class)
                        .returnResult()
                        .getResponseBody();
        assertThat(body).isNotNull();
        return body;
    }


    private static String entryJson(UUID activityId, String caption, UUID fromDump, boolean shareToFeed) {
        String captionField = caption == null ? "null" : "\"" + caption + "\"";
        String dump = fromDump == null ? "" : "\"" + fromDump + "\"";
        return "{\"activityId\":\""
                + activityId
                + "\",\"caption\":"
                + captionField
                + ",\"fromDump\":["
                + dump
                + "],\"shareToFeed\":"
                + shareToFeed
                + "}";
    }


    private UUID uploadToDump(String token, Fixture trip) throws IOException {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("photo", namedPhoto("dumped.jpg")).contentType(MediaType.IMAGE_JPEG);
        byte[] body =
                rest.post()
                        .uri("/v1/itineraries/" + trip.tripId() + "/photo-dump")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(builder.build())
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return UUID.fromString(TripRig.fieldIn(body, "id"));
    }


    private Fixture startedTrip() throws IOException {
        String owner = rig.travelerWithHandle(handle());
        String tripId = rig.createTrip(owner, 3);
        String member = rig.joinAsMember(owner, tripId, handle());
        UUID activityId = rig.addActivity(owner, tripId, rig.dayAt(tripId, 1), "Sunset at Las Cabanas");
        Fixture trip = new Fixture(owner, member, tripId, activityId);
        advance(trip, "finish-planning");
        advance(trip, "start");
        return trip;
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


    private static UUID photoOf(Entry entry) {
        assertThat(entry.photos()).isNotEmpty();
        return entry.photos().getFirst().id();
    }


    private static Entry entryFrom(byte[] body) {
        Entry parsed = JSON.readValue(body, Entry.class);
        assertThat(parsed).isNotNull();
        return parsed;
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
        pen.setColor(Color.BLUE);
        pen.fillRect(0, 0, 400, 300);
        pen.dispose();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(image, "jpeg", bytes);
        return bytes.toByteArray();
    }


    private static String shareUri(Fixture trip, UUID entryId) {
        return diaryUri(trip) + "/" + entryId + "/share";
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


    private static final ObjectMapper JSON = new ObjectMapper();


    private record Fixture(String owner, String member, String tripId, UUID activityId) {}

    private record Entry(UUID id, String caption, List<EntryPhoto> photos, Instant sharedAt) {}

    private record EntryPhoto(UUID id, String url, String thumbUrl) {}
}
