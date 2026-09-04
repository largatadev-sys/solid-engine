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
import javax.imageio.ImageIO;
import java.util.UUID;
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
class PrivateAuthorFeedFilterIT extends ObjectStoreTestBase {

    private static final String FEED_URI = "/v1/feed/postcards";

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
    void aPrivateAuthorsPostcardLeavesAStrangersFeedAndStaysOnAFollowersAndTheirOwn() throws IOException {
        Author author = authorWithAPostcard("Sunset over Palawan");
        String stranger = onboarded();
        String follower = onboarded();
        follow(follower, author.travelerId());

        assertThat(captionsFor(stranger)).contains("Sunset over Palawan");

        goPrivate(author.token());

        assertThat(captionsFor(stranger))
                .as("a private author's postcards leave every non-follower's Home")
                .doesNotContain("Sunset over Palawan");
        assertThat(captionsFor(follower))
                .as("...and stay on the feed of somebody they approved")
                .contains("Sunset over Palawan");
        assertThat(captionsFor(author.token()))
                .as("...and an author always sees their own")
                .contains("Sunset over Palawan");
    }


    @Test
    void aPublicAuthorsPostcardIsUnchangedForAViewerWhoseWorldHasNoPrivateAuthorInIt()
            throws IOException {
        authorWithAPostcard("Kyoto in the rain");
        String viewer = onboarded();

        assertThat(captionsFor(viewer)).contains("Kyoto in the rain");
    }


    @Test
    void anEmptyHiddenSetWalksTheUnfilteredQueryOnBothPages() throws IOException {
        Author first = authorWithAPostcard("Default path one");
        postAnother(first, "Default path two");
        String viewer = onboarded();

        FeedPage page = pageFor(viewer, "?limit=1");
        assertThat(page.items()).hasSize(1);
        assertThat(page.nextCursor())
                .as("a viewer whose world holds no private author takes the pre-story query, "
                        + "and it must still hand back a cursor")
                .isNotNull();

        FeedPage after = pageFor(viewer, "?limit=1&cursor=" + page.nextCursor());
        assertThat(after.items())
                .as("the after-cursor branch of the unfiltered path — the default every viewer "
                        + "takes today, and the one branch nothing else exercises")
                .hasSize(1);
        assertThat(captionsIn(after)).isNotEqualTo(captionsIn(page));
    }


    @Test
    void theFollowingScopeIsUnchangedByConstruction() throws IOException {
        Author author = authorWithAPostcard("Siargao at dawn");
        String follower = onboarded();
        follow(follower, author.travelerId());
        goPrivate(author.token());

        assertThat(captionsIn(pageFor(follower, "?scope=following")))
                .as("a followee is never hidden, so this scope cannot be narrowed by the fence")
                .contains("Siargao at dawn");
    }


    @Test
    void aCoTravelerWhoDoesNotFollowGainsNothingFromTheSharedTrip() throws IOException {
        Author author = authorWithAPostcard("Our shared trip");
        goPrivate(author.token());

        assertThat(captionsFor(author.member()))
                .as("membership is not the key — follow is (spec decision 9)")
                .doesNotContain("Our shared trip");
    }


    @Test
    void theCursorSkipsHiddenEntriesWithoutShorteningThePage() throws IOException {
        Author hidden = authorWithAPostcard("Hidden one");
        postAnother(hidden, "Hidden two");
        Author visible = authorWithAPostcard("Visible one");
        postAnother(visible, "Visible two");
        String stranger = onboarded();

        goPrivate(hidden.token());

        FeedPage first = pageFor(stranger, "?limit=1");
        assertThat(first.items()).hasSize(1);
        assertThat(first.nextCursor()).isNotNull();

        List<String> walked = new java.util.ArrayList<>(captionsIn(first));
        String cursor = first.nextCursor();
        while (cursor != null && walked.size() < 10) {
            FeedPage next = pageFor(stranger, "?limit=1&cursor=" + cursor);
            walked.addAll(captionsIn(next));
            String following = next.nextCursor();
            if (following != null && following.equals(cursor)) {
                throw new AssertionError("the cursor repeated itself: " + cursor);
            }
            cursor = following;
        }

        assertThat(walked)
                .as("every page is a full page of VISIBLE entries, hidden ones skipped in the query")
                .contains("Visible one", "Visible two")
                .doesNotContain("Hidden one", "Hidden two");
    }


    @Test
    void theProfilesPerTripDiaryIsRefusedByNameForAStrangerOfAPrivateAuthor() throws IOException {
        Author author = authorWithAPostcard("By the trip");
        String stranger = onboarded();
        String follower = onboarded();
        follow(follower, author.travelerId());

        tripDiary(author, stranger).expectStatus().isOk();

        goPrivate(author.token());

        tripDiary(author, stranger)
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("PROFILE_PRIVATE");
        tripDiary(author, follower).expectStatus().isOk();
        tripDiary(author, author.token()).expectStatus().isOk();
    }


    @Test
    void aPostcardsPhotoBytesAnswerNothingToAStrangerOfAPrivateAuthor() throws IOException {
        Author author = authorWithAPostcard("With a photo");
        String stranger = onboarded();
        String follower = onboarded();
        follow(follower, author.travelerId());
        String photoUrl = firstPhotoUrlOf(author);

        photo(photoUrl, stranger).expectStatus().isOk();

        goPrivate(author.token());

        photo(photoUrl, stranger).expectStatus().isNotFound();
        photo(photoUrl, follower).expectStatus().isOk();
        photo(photoUrl, author.token()).expectStatus().isOk();
    }


    private RestTestClient.ResponseSpec tripDiary(Author author, String viewer) {
        return rest.get()
                .uri(FEED_URI + "/trips/" + author.tripId() + "/by/" + author.travelerId())
                .header(HttpHeaders.AUTHORIZATION, bearer(viewer))
                .exchange();
    }


    private RestTestClient.ResponseSpec photo(String url, String viewer) {
        return rest.get()
                .uri(url.substring(url.indexOf("/v1/")))
                .header(HttpHeaders.AUTHORIZATION, bearer(viewer))
                .exchange();
    }


    private String firstPhotoUrlOf(Author author) {
        FeedPage page = pageFor(author.token(), "");
        Card card =
                page.items().stream()
                        .filter(item -> !item.photos().isEmpty())
                        .findFirst()
                        .orElseThrow(() -> new AssertionError("no postcard with a photo in " + page.items()));
        return card.photos().getFirst().url();
    }


    private List<String> captionsFor(String token) {
        return captionsIn(pageFor(token, ""));
    }


    private static List<String> captionsIn(FeedPage page) {
        return page.items().stream().map(Card::caption).toList();
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


    private Author authorWithAPostcard(String caption) throws IOException {
        String token = onboarded();
        String tripId = rig.createTrip(token, 3);
        String member = rig.joinAsMember(token, tripId, handle());
        UUID activityId = rig.addActivity(token, tripId, rig.dayAt(tripId, 1), "A thing we did");
        advance(token, tripId, "start");

        Author author = new Author(token, member, tripId, rig.travelerIdOf(token));
        post(author, activityId, caption);
        return author;
    }


    private void postAnother(Author author, String caption) throws IOException {
        UUID activityId =
                rig.addActivity(author.token(), author.tripId(), rig.dayAt(author.tripId(), 2), "Another");
        post(author, activityId, caption);
    }


    private void post(Author author, UUID activityId, String caption) throws IOException {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part(
                "entry",
                "{\"activityId\":\"" + activityId + "\",\"caption\":\"" + caption + "\",\"fromDump\":[]}",
                MediaType.TEXT_PLAIN);
        builder.part("photos", namedPhoto()).contentType(MediaType.IMAGE_JPEG);
        rest.post()
                .uri("/v1/itineraries/" + author.tripId() + "/diary/entries")
                .header(HttpHeaders.AUTHORIZATION, bearer(author.token()))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(builder.build())
                .exchange()
                .expectStatus()
                .isCreated();
    }


    private void advance(String token, String tripId, String step) {
        rest.post()
                .uri("/v1/itineraries/" + tripId + "/" + step)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void follow(String follower, UUID followeeId) {
        rest.post()
                .uri("/v1/travelers/" + followeeId + "/follow")
                .header(HttpHeaders.AUTHORIZATION, bearer(follower))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void goPrivate(String token) {
        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"profileVisibility\":\"private\"}")
                .exchange()
                .expectStatus()
                .isOk();
    }


    private String onboarded() {
        String token = rig.travelerWithHandle(handle());
        rest.post()
                .uri("/v1/me/onboarding-completion")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
        return token;
    }


    private static ByteArrayResource namedPhoto() throws IOException {
        byte[] bytes = photo();
        return new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return "device.jpg";
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


    private static String handle() {
        return "h" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }


    private static String bearer(String token) {
        return TripRig.bearer(token);
    }


    private record Author(String token, String member, String tripId, UUID travelerId) {}

    private record Card(UUID id, String caption, List<CardPhoto> photos) {}

    private record CardPhoto(UUID id, String url, String thumbUrl) {}

    private record FeedPage(List<Card> items, String nextCursor) {}
}
