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
    void aTravelerWhoSharesNoTripWithTheAuthorReadsThePostcard() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        String one = tag("the first one");
        String other = tag("the other one");
        post(trip, trip.activityId(), one);
        UUID posted = post(trip, secondActivity(trip), other);

        List<Card> feed = feedFor(stranger);

        assertThat(captionsOf(feed))
                .as("no membership anywhere in the read — the stranger receives both postcards")
                .contains(one, other);
        assertThat(feed.getFirst().id()).isEqualTo(posted);
        assertThat(feed.getFirst().photos()).isNotEmpty();
    }


    @Test
    void theOrderIsPostTimeSoTheNewestPostcardLeads() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        String first = tag("posted first");
        String second = tag("posted second");
        post(trip, trip.activityId(), first);
        UUID newer = post(trip, secondActivity(trip), second);

        assertThat(minePositionsIn(feedFor(stranger), first, second))
                .as("shared-at is post-at now, so the feed's order is simply the order they were written")
                .containsExactly(second, first);
        assertThat(feedFor(stranger).getFirst().id())
                .as("and the newest sits at the very top of the global stream")
                .isEqualTo(newer);
    }


    @Test
    void theProjectionCarriesTheCardAndWithholdsEverythingElse() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        post(trip, trip.activityId(), tag("what the world may see"));

        String wire = rawFeedFor(stranger);
        Card card = feedFor(stranger).getFirst();

        assertThat(card.tripTitle()).isEqualTo("Trip");
        assertThat(card.dayLabel()).isEqualTo("Day 1");
        assertThat(card.activityTitle()).isEqualTo(ACTIVITY_TITLE);
        assertThat(card.author().handle()).isNotBlank();
        assertThat(card.sharedAt()).isNotNull();
        assertThat(card.place())
                .as("the pin's label is the activity's place, and this fixture named none")
                .isNull();

        assertThat(fieldNamesIn(wire))
                .as("the card is exactly these fields — anything else is a leak this test must catch")
                .containsExactlyInAnyOrder(
                        "items",
                        "nextCursor",
                        "id",
                        "author",
                        "itineraryId",
                        "handle",
                        "displayName",
                        "avatarUrl",
                        "tripTitle",
                        "publishedItineraryId",
                        "dayLabel",
                        "activityTitle",
                        "place",
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
        post(trip, trip.activityId(), one);
        post(trip, secondActivity(trip), two);
        post(trip, thirdActivity(trip), three);

        List<String> walked = new ArrayList<>();
        List<UUID> idsSeen = new ArrayList<>();
        Set<String> cursorsFollowed = new HashSet<>();
        int pagesRead = 0;
        String cursor = null;
        do {
            FeedPage page = pageFor(stranger, "?limit=1" + (cursor == null ? "" : "&cursor=" + cursor));
            pagesRead += 1;
            page.items()
                    .forEach(
                            card -> {
                                walked.add(card.caption());
                                idsSeen.add(card.id());
                            });
            cursor = page.nextCursor();
            if (cursor != null && !cursorsFollowed.add(cursor)) {
                throw new AssertionError("the feed handed back a cursor it had already issued: " + cursor);
            }
        } while (cursor != null);

        assertThat(pagesRead)
                .as("a one-per-page walk reaches a null cursor and stops, never spinning")
                .isEqualTo(cursorsFollowed.size() + 1);
        assertThat(idsSeen).as("and no card is ever served twice across the walk").doesNotHaveDuplicates();
        assertThat(onlyMine(walked, one, two, three))
                .as("newest first, each seen exactly once across the whole walk")
                .containsExactly(three, two, one);
    }


    @Test
    void theWalkReachesACardSittingBehindAWhollyArchivedPage() throws IOException {
        Fixture buried = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        String reachable = tag("underneath");
        post(buried, buried.activityId(), reachable);

        Fixture hidden = startedTrip();
        String gone = tag("archived over the top");
        post(hidden, hidden.activityId(), gone);
        archive(hidden);

        List<String> walked = new ArrayList<>();
        Set<String> cursorsFollowed = new HashSet<>();
        String cursor = null;
        do {
            FeedPage page = pageFor(stranger, "?limit=1" + (cursor == null ? "" : "&cursor=" + cursor));
            page.items().forEach(card -> walked.add(card.caption()));
            cursor = page.nextCursor();
            if (cursor != null && !cursorsFollowed.add(cursor)) {
                throw new AssertionError("the feed re-issued a cursor: " + cursor);
            }
        } while (cursor != null);

        assertThat(onlyMine(walked, reachable, gone))
                .as("the newest page carries only an archived card, so it comes back EMPTY with a "
                        + "cursor — and the walk must still arrive at the card underneath. This is "
                        + "the whole reason the cursor is taken from the last row READ rather than "
                        + "the last card KEPT; take it from the kept card and this stalls.")
                .containsExactly(reachable);
    }


    @Test
    void archivingATripTakesItsPostcardsOffTheFeedWithIt() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        String caption = tag("put away");
        post(trip, trip.activityId(), caption);
        assertThat(captionsOf(feedFor(stranger))).contains(caption);

        archive(trip);

        assertThat(captionsOf(feedFor(stranger)))
                .as("archiving is the traveler's bulk retraction — the whole trip leaves the feed")
                .doesNotContain(caption);
    }


    @Test
    void unarchivingPutsThemBackBecauseArchivingIsNotDeleting() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        String caption = tag("back again");
        post(trip, trip.activityId(), caption);
        archive(trip);
        assertThat(captionsOf(feedFor(stranger))).doesNotContain(caption);

        unarchive(trip);

        assertThat(captionsOf(feedFor(stranger)))
                .as("reversible, which is the whole reason archive can be the bulk retraction")
                .contains(caption);
    }


    @Test
    void anArchivedTripsPublicDiaryIsNotFoundRatherThanEmpty() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        UUID author = rig.travelerIdOf(trip.owner());
        post(trip, trip.activityId(), tag("in the diary"));
        assertThat(tripDiaryFor(stranger, trip.tripId(), author).postcards()).hasSize(1);

        archive(trip);

        rest.get()
                .uri(tripDiaryUri(trip.tripId(), author))
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    @Test
    void archivingOneTripLeavesEveryOtherTripsPostcardsAlone() throws IOException {
        Fixture archived = startedTrip();
        Fixture kept = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        String goes = tag("on the archived trip");
        String stays = tag("on the other trip");
        post(archived, archived.activityId(), goes);
        post(kept, kept.activityId(), stays);

        archive(archived);

        assertThat(captionsOf(feedFor(stranger)))
                .as("the exclusion is per trip — one archive must not empty the feed")
                .contains(stays)
                .doesNotContain(goes);
    }


    @Test
    void deleteIsTheOnlyDoorOutOfTheFeed() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        String kept = tag("kept");
        String removed = tag("removed outright");
        UUID staying = post(trip, trip.activityId(), kept);
        UUID deleted = post(trip, secondActivity(trip), removed);
        assertThat(captionsOf(feedFor(stranger))).contains(kept, removed);

        rig.send(HttpMethod.DELETE, diaryUri(trip) + "/" + staying + "/share", trip.owner(), null)
                .expectStatus()
                .isNotFound();
        rig.send(HttpMethod.DELETE, diaryUri(trip) + "/" + deleted, trip.owner(), null)
                .expectStatus()
                .isNoContent();

        assertThat(captionsOf(feedFor(stranger)))
                .as("delete closes the one door; there is no unshare beside it to try")
                .contains(kept)
                .doesNotContain(removed);
    }


    @Test
    void theTripReferenceArrivesOnlyOnceTheTripIsPublished() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        UUID entryId = post(trip, trip.activityId(), tag("mid-trip, live"));

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
    void theTripDiaryShowsAStrangerEveryPostcardOfThatTrip() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        String one = tag("in the public diary");
        String two = tag("also there");
        String three = tag("and this one");
        post(trip, trip.activityId(), one);
        post(trip, secondActivity(trip), two);
        post(trip, thirdActivity(trip), three);

        TripDiary diary = tripDiaryFor(stranger, trip.tripId(), rig.travelerIdOf(trip.owner()));

        assertThat(diary.postcards().stream().map(Card::caption).toList())
                .as("every postcard this author wrote for this trip, because they are all public")
                .containsExactlyInAnyOrder(one, two, three);
        assertThat(diary.tripTitle()).isEqualTo("Trip");
        assertThat(diary.author().handle()).isNotBlank();
    }


    @Test
    void aTripTheAuthorNeverWroteAPostcardForIsNotFoundRatherThanEmpty() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());

        rest.get()
                .uri(tripDiaryUri(trip.tripId(), rig.travelerIdOf(trip.owner())))
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    @Test
    void deletingTheLastPostcardClosesThePublicDiaryAgain() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        UUID only = post(trip, trip.activityId(), tag("the only one"));
        UUID author = rig.travelerIdOf(trip.owner());

        assertThat(tripDiaryFor(stranger, trip.tripId(), author).postcards()).hasSize(1);

        rig.send(HttpMethod.DELETE, diaryUri(trip) + "/" + only, trip.owner(), null)
                .expectStatus()
                .isNoContent();

        rest.get()
                .uri(tripDiaryUri(trip.tripId(), author))
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    @Test
    void oneAuthorsPublicDiaryNeverCarriesAnothersPostcardsFromTheSameTrip() throws IOException {
        Fixture trip = startedTrip();
        String stranger = rig.travelerWithHandle(handle());
        String owners = tag("the owner shared this");
        post(trip, trip.activityId(), owners);

        UUID theMember = rig.travelerIdOf(trip.member());
        rest.get()
                .uri(tripDiaryUri(trip.tripId(), theMember))
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound();

        assertThat(
                        tripDiaryFor(stranger, trip.tripId(), rig.travelerIdOf(trip.owner()))
                                .postcards()
                                .stream()
                                .map(Card::caption)
                                .toList())
                .containsExactly(owners);
    }


    @Test
    void theTripDiaryStillRequiresATraveler() throws IOException {
        Fixture trip = startedTrip();
        post(trip, trip.activityId(), tag("public"));

        rest.get()
                .uri(tripDiaryUri(trip.tripId(), rig.travelerIdOf(trip.owner())))
                .exchange()
                .expectStatus()
                .isUnauthorized();
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
        post(theirs, theirs.activityId(), one);
        post(mine, mine.activityId(), another);
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


    private TripDiary tripDiaryFor(String token, String tripId, UUID authorId) {
        TripDiary body =
                rest.get()
                        .uri(tripDiaryUri(tripId, authorId))
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody(TripDiary.class)
                        .returnResult()
                        .getResponseBody();
        assertThat(body).isNotNull();
        return body;
    }


    private static String tripDiaryUri(String tripId, UUID authorId) {
        return FEED_URI + "/trips/" + tripId + "/by/" + authorId;
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


    private static List<String> onlyMine(List<String> captions, String... mine) {
        Set<String> wanted = Set.of(mine);
        return captions.stream().filter(caption -> caption != null && wanted.contains(caption)).toList();
    }


    private static List<String> minePositionsIn(List<Card> feed, String... mine) {
        return onlyMine(captionsOf(feed), mine);
    }



    private void archive(Fixture trip) {
        rest.post()
                .uri("/v1/itineraries/" + trip.tripId() + "/archive")
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void unarchive(Fixture trip) {
        rest.post()
                .uri("/v1/itineraries/" + trip.tripId() + "/unarchive")
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .exchange()
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


    private UUID post(Fixture trip, UUID activityId, String caption) throws IOException {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part(
                "entry",
                "{\"activityId\":\"" + activityId + "\",\"caption\":\"" + caption + "\",\"fromDump\":[]}",
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
            UUID itineraryId,
            String tripTitle,
            UUID publishedItineraryId,
            String dayLabel,
            String activityTitle,
            String place,
            String caption,
            Instant sharedAt,
            List<CardPhoto> photos) {}

    private record Author(UUID id, String handle, String displayName, String avatarUrl) {}

    private record CardPhoto(UUID id, String url, String thumbUrl) {}

    private record FeedPage(List<Card> items, String nextCursor) {}

    private record TripDiary(
            UUID itineraryId,
            Author author,
            String tripTitle,
            UUID publishedItineraryId,
            List<Card> postcards) {}
}
