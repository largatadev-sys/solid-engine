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
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class PostcardFeedIT extends ObjectStoreTestBase {

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
    void aTravelerWhoSharesNoTripWithTheAuthorReadsTheSharedPostcard() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        String shared = tag("the shared one");
        String secret = tag("the private one");
        UUID posted = post(trip, trip.activityId(), shared, true);
        post(trip, secondActivity(trip), secret, false);

        List<Card> feed = feedFor(stranger);

        assertThat(captionsOf(feed))
                .as("no membership anywhere in the read — the stranger receives the shared postcard")
                .contains(shared)
                .as("and an unshared entry never crosses")
                .doesNotContain(secret);
        assertThat(feed.getFirst().id()).isEqualTo(posted);
        assertThat(feed.getFirst().photos()).isNotEmpty();
    }


    @Test
    void theOrderIsSharedTimeSoARetroSharedOldPostcardSurfacesAtTheTop() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        String first = tag("posted first");
        String second = tag("posted second");
        UUID older = post(trip, trip.activityId(), first, false);
        post(trip, secondActivity(trip), second, true);

        assertThat(captionsOf(feedFor(stranger))).contains(second).doesNotContain(first);

        share(trip, older);

        assertThat(minePositionsIn(feedFor(stranger), first, second))
                .as("retro-sharing is the point: the older postcard, shared last, now leads")
                .containsExactly(first, second);
        assertThat(feedFor(stranger).getFirst().id())
                .as("and it sits at the very top of the global stream")
                .isEqualTo(older);
    }


    @Test
    void theProjectionCarriesTheCardAndWithholdsEverythingElse() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        post(trip, trip.activityId(), tag("what the world may see"), true);

        String wire = rawFeedFor(stranger);
        Card card = feedFor(stranger).getFirst();

        assertThat(card.tripTitle()).isEqualTo("Trip");
        assertThat(card.dayLabel()).isEqualTo("Day 1");
        assertThat(card.activityTitle()).isEqualTo(ACTIVITY_TITLE);
        assertThat(card.author().handle()).isNotBlank();
        assertThat(card.sharedAt()).isNotNull();

        assertThat(fieldNamesIn(wire))
                .as("the card is exactly these fields — anything else is a leak this test must catch")
                .containsExactlyInAnyOrder(
                        "items",
                        "nextCursor",
                        "id",
                        "author",
                        "handle",
                        "displayName",
                        "avatarUrl",
                        "tripTitle",
                        "publishedItineraryId",
                        "dayLabel",
                        "activityTitle",
                        "caption",
                        "sharedAt",
                        "photos",
                        "url",
                        "thumbUrl");
        assertThat(wire)
                .as("the roster never reaches a public surface — only the consenting author is named")
                .doesNotContain(rig.travelerIdOf(trip.member()).toString());
        assertThat(wire)
                .as("no lifecycle state and no absolute trip dates — the INV-2 absence discipline")
                .doesNotContain("ongoing")
                .doesNotContain("ONGOING");
    }


    @Test
    void theCursorWalksToExhaustionWithoutEverRepeatingItself() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        String one = tag("one");
        String two = tag("two");
        String three = tag("three");
        post(trip, trip.activityId(), one, true);
        post(trip, secondActivity(trip), two, true);
        post(trip, thirdActivity(trip), three, true);

        List<String> walked = new ArrayList<>();
        Set<String> cursorsFollowed = new HashSet<>();
        String cursor = null;
        do {
            FeedPage page = pageFor(stranger, "?limit=1" + (cursor == null ? "" : "&cursor=" + cursor));
            page.items().forEach(card -> walked.add(card.caption()));
            cursor = page.nextCursor();
            if (cursor != null && !cursorsFollowed.add(cursor)) {
                throw new AssertionError("the feed handed back a cursor it had already issued: " + cursor);
            }
        } while (cursor != null);

        assertThat(walked)
                .as("a one-per-page walk reaches a null cursor and stops, never spinning")
                .doesNotHaveDuplicates();
        assertThat(walked.stream().filter(Set.of(one, two, three)::contains).toList())
                .as("newest-shared first, each seen exactly once across the whole walk")
                .containsExactly(three, two, one);
    }


    @Test
    void unsharingAndDeletingBothRemoveThePostcardFromTheFeed() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        String pulledBack = tag("pulled back");
        String removed = tag("removed outright");
        UUID unshared = post(trip, trip.activityId(), pulledBack, true);
        UUID deleted = post(trip, secondActivity(trip), removed, true);
        assertThat(captionsOf(feedFor(stranger))).contains(pulledBack, removed);

        rig.send(HttpMethod.DELETE, diaryUri(trip) + "/" + unshared + "/share", trip.owner(), null)
                .expectStatus()
                .isOk();
        rig.send(HttpMethod.DELETE, diaryUri(trip) + "/" + deleted, trip.owner(), null)
                .expectStatus()
                .isNoContent();

        assertThat(captionsOf(feedFor(stranger)))
                .as("both doors out of the feed close on the next fetch")
                .doesNotContain(pulledBack, removed);
    }


    @Test
    void theTripReferenceArrivesOnlyOnceTheTripIsPublished() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        UUID entryId = post(trip, trip.activityId(), tag("mid-trip, live"), true);

        Card whileOngoing = cardIn(feedFor(stranger), entryId);
        assertThat(whileOngoing.tripTitle()).as("the name and day label are always there").isEqualTo("Trip");
        assertThat(whileOngoing.dayLabel()).isEqualTo("Day 1");
        assertThat(whileOngoing.publishedItineraryId())
                .as("nothing to navigate to yet — the line renders inert")
                .isNull();

        publish(trip);

        assertThat(cardIn(feedFor(stranger), entryId).publishedItineraryId())
                .as("the link self-heals the moment the trip publishes")
                .isEqualTo(UUID.fromString(trip.tripId()));
    }


    @Test
    void theFeedStillRequiresATraveler() {
        rest.get().uri(FEED_URI).exchange().expectStatus().isUnauthorized();
    }


    @Test
    void theFeedIsOneGlobalStreamAcrossTravelersWhoShareNothing() throws IOException {
        Fixture theirs = startedTrip();
        Fixture mine = startedTrip();
        String one = tag("from one trip");
        String another = tag("from another");
        post(theirs, theirs.activityId(), one, true);
        post(mine, mine.activityId(), another, true);
        String stranger = rig.travelerWithHandle(handle());

        assertThat(minePositionsIn(feedFor(stranger), one, another))
                .as("a firehose, not a per-viewer filter — two unrelated trips in one stream")
                .containsExactly(another, one);
    }


    private List<Card> feedFor(String token) {
        return pageFor(token, "").items();
    }


    private FeedPage pageFor(String token, String query) {
        FeedPage body =
                rest.get()
                        .uri(FEED_URI + query)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody(FeedPage.class)
                        .returnResult()
                        .getResponseBody();
        assertThat(body).isNotNull();
        return body;
    }


    private String rawFeedFor(String token) {
        return new String(
                rest.get()
                        .uri(FEED_URI)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent());
    }


    private static List<String> captionsOf(List<Card> feed) {
        return feed.stream().map(Card::caption).toList();
    }


    private static Card cardIn(List<Card> feed, UUID entryId) {
        return feed.stream()
                .filter(card -> entryId.equals(card.id()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("the feed did not carry entry " + entryId));
    }


    private static Set<String> fieldNamesIn(String json) {
        Set<String> names = new HashSet<>();
        Matcher keys = JSON_KEY.matcher(json);
        while (keys.find()) {
            names.add(keys.group(1));
        }
        return names;
    }


    private static List<String> minePositionsIn(List<Card> feed, String... mine) {
        Set<String> wanted = Set.of(mine);
        return captionsOf(feed).stream().filter(wanted::contains).toList();
    }


    private void share(Fixture trip, UUID entryId) {
        rig.send(HttpMethod.POST, diaryUri(trip) + "/" + entryId + "/share", trip.owner(), null)
                .expectStatus()
                .isOk();
    }


    private void publish(Fixture trip) {
        rest.post()
                .uri("/v1/itineraries/" + trip.tripId() + "/complete")
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isOk();
        rig.send(
                        HttpMethod.POST,
                        "/v1/itineraries/" + trip.tripId() + "/publish",
                        trip.owner(),
                        "{\"visibility\":\"public\"}")
                .expectStatus()
                .isOk();
    }


    private UUID post(Fixture trip, UUID activityId, String caption, boolean shareToFeed)
            throws IOException {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part(
                "entry",
                "{\"activityId\":\""
                        + activityId
                        + "\",\"caption\":\""
                        + caption
                        + "\",\"fromDump\":[],\"shareToFeed\":"
                        + shareToFeed
                        + "}",
                MediaType.TEXT_PLAIN);
        builder.part("photos", namedPhoto("device.jpg")).contentType(MediaType.IMAGE_JPEG);
        byte[] body =
                rest.post()
                        .uri(diaryUri(trip))
                        .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
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


    private UUID secondActivity(Fixture trip) {
        return rig.addActivity(trip.owner(), trip.tripId(), rig.dayAt(trip.tripId(), 2), "A second stop");
    }


    private UUID thirdActivity(Fixture trip) {
        return rig.addActivity(trip.owner(), trip.tripId(), rig.dayAt(trip.tripId(), 3), "A third stop");
    }


    private Fixture startedTrip() throws IOException {
        String owner = rig.travelerWithHandle(handle());
        String tripId = rig.createTrip(owner, 3);
        String member = rig.joinAsMember(owner, tripId, handle());
        UUID activityId = rig.addActivity(owner, tripId, rig.dayAt(tripId, 1), ACTIVITY_TITLE);
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
        pen.setColor(Color.ORANGE);
        pen.fillRect(0, 0, 400, 300);
        pen.dispose();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(image, "jpeg", bytes);
        return bytes.toByteArray();
    }


    private static String diaryUri(Fixture trip) {
        return "/v1/itineraries/" + trip.tripId() + "/diary/entries";
    }


    private static String tag(String caption) {
        return caption + " #" + UUID.randomUUID().toString().substring(0, 8);
    }


    private static String handle() {
        return "h" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }


    private static String bearer(String token) {
        return "Bearer " + token;
    }


    private static final String FEED_URI = "/v1/feed/postcards";

    private static final String ACTIVITY_TITLE = "Sunset at Las Cabanas";

    private static final Pattern JSON_KEY = Pattern.compile("\"([A-Za-z][A-Za-z0-9]*)\"\\s*:");


    private record Fixture(String owner, String member, String tripId, UUID activityId) {}

    private record Card(
            UUID id,
            Author author,
            String tripTitle,
            UUID publishedItineraryId,
            String dayLabel,
            String activityTitle,
            String caption,
            Instant sharedAt,
            List<CardPhoto> photos) {}

    private record Author(UUID id, String handle, String displayName, String avatarUrl) {}

    private record CardPhoto(UUID id, String url, String thumbUrl) {}

    private record FeedPage(List<Card> items, String nextCursor) {}
}
