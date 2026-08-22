package com.largata.join;

import static com.largata.support.TripRig.bearer;
import static com.largata.support.TripRig.fieldIn;
import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.ObjectStoreTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class JoinCardIT extends ObjectStoreTestBase {

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
    void theCardIsAPngOfExactlyTheDimensionsTheTagsPromise() throws Exception {
        String token = tokenOf(trip());

        byte[] png =
                rest.get()
                        .uri(cardUri(token))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectHeader()
                        .contentType(MediaType.IMAGE_PNG)
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();

        BufferedImage card = ImageIO.read(new ByteArrayInputStream(png));
        assertThat(card.getWidth()).isEqualTo(1200);
        assertThat(card.getHeight()).isEqualTo(630);
    }


    @Test
    void theCardIsPubliclyCacheableBecauseItsUrlCarriesTheVersion() {
        String token = tokenOf(trip());

        rest.get()
                .uri(cardUri(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectHeader()
                .value(HttpHeaders.CACHE_CONTROL, value -> assertThat(value).contains("public"));
    }


    @Test
    void theVersionQueryIsAcceptedAndProvablyIgnored() {
        String token = tokenOf(trip());

        byte[] bare = cardBytes(cardUri(token));
        byte[] versioned = cardBytes(cardUri(token) + "?v=7");
        byte[] absurd = cardBytes(cardUri(token) + "?v=99999");

        assertThat(versioned).isEqualTo(bare);
        assertThat(absurd).isEqualTo(bare);
    }


    @Test
    void anUnknownTokenGetsNoCardAtAll() {
        rest.get().uri(cardUri("nosuchtoken")).exchange().expectStatus().isNotFound();
    }


    @Test
    void anUnknownTokenGetsNoPreviewEither() {
        rest.get().uri(previewUri("nosuchtoken")).exchange().expectStatus().isNotFound();
    }


    @Test
    void aCoverlessTripAndACoveredTripDoNotRenderTheSameCard() {
        String coverless = tokenOf(trip());
        Trip covered = trip();
        rig.uploadCover(covered.owner(), covered.id());

        assertThat(cardBytes(cardUri(tokenOf(covered)))).isNotEqualTo(cardBytes(cardUri(coverless)));
    }


    @Test
    void aDeadLinkStillRendersACardRatherThanBreakingTheUnfurl() {
        Trip trip = trip();
        String token = tokenOf(trip);
        byte[] alive = cardBytes(cardUri(token));
        close(trip);

        byte[] dead = cardBytes(cardUri(token));

        assertThat(dead).isNotEqualTo(alive);
        assertThat(dead).isNotEmpty();
    }


    @Test
    void thePreviewCarriesThisTripsTagsRatherThanTheSitewideOnes() {
        String token = tokenOf(trip());

        assertThat(previewBody(token))
                .contains("<meta property=\"og:title\" content=\"You&#39;re invited: Trip\">")
                .contains("<meta property=\"og:description\" content=\"Palawan\">")
                .contains("<meta name=\"twitter:card\" content=\"summary_large_image\">")
                .contains("<meta property=\"og:site_name\" content=\"Largata\">");
    }


    @Test
    void theImageTagIsAbsoluteAndResolvesToTheCardRoute() throws Exception {
        String token = tokenOf(trip());

        String imageUrl = contentOf(previewBody(token), "og:image");

        assertThat(imageUrl).startsWith("http://").contains("/v1/join/" + token + "/card.png");
        BufferedImage fetched =
                ImageIO.read(new ByteArrayInputStream(cardBytes(pathOf(imageUrl))));
        assertThat(fetched.getWidth()).isEqualTo(1200);
    }


    @Test
    void theImageUrlCarriesTheSameVersionAsThePageUrl() {
        String token = tokenOf(trip());
        String page = previewBody(token);

        assertThat(contentOf(page, "og:image")).endsWith("?v=1");
        assertThat(contentOf(page, "og:url")).endsWith("?v=1");
    }


    @Test
    void thePreviewLinksToTheLandingWithoutRedirectingIntoALoop() {
        String token = tokenOf(trip());
        String page = previewBody(token);

        assertThat(page).contains("/join/" + token).contains("Open this invite");
        assertThat(page).doesNotContain("http-equiv=\"refresh\"").doesNotContain("<script");
    }


    @Test
    void thePreviewIsNeverCachedSoAReScrapeAlwaysSeesCurrentTags() {
        String token = tokenOf(trip());

        rest.get()
                .uri(previewUri(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectHeader()
                .value(HttpHeaders.CACHE_CONTROL, value -> assertThat(value).contains("no-cache"));
    }


    @Test
    void aDeadLinksPreviewSaysSoWithoutNamingTheTrip() {
        Trip trip = trip();
        String token = tokenOf(trip);
        close(trip);

        assertThat(previewBody(token))
                .contains("<meta property=\"og:title\" content=\"Largata\">")
                .contains("no longer active")
                .doesNotContain("You&#39;re invited");
    }


    @Test
    void theShareLinkIsHandedOutAtVersionOneForAFreshTrip() {
        Trip trip = trip();

        assertThat(shareUrlOf(trip)).endsWith("?v=1");
    }


    @Test
    void editingTheTitleBumpsTheHandedOutVersion() {
        Trip trip = trip();

        rig.editHeader(trip.owner(), trip.id(), header("Renamed", "Palawan", null));

        assertThat(shareUrlOf(trip)).endsWith("?v=2");
    }


    @Test
    void editingTheDestinationBumpsIt() {
        Trip trip = trip();

        rig.editHeader(trip.owner(), trip.id(), header("Trip", "El Nido", null));

        assertThat(shareUrlOf(trip)).endsWith("?v=2");
    }


    @Test
    void editingTheDatesBumpsIt() {
        Trip trip = trip();

        rig.editHeader(
                trip.owner(),
                trip.id(),
                header("Trip", "Palawan", "\"startDate\":\"2026-03-12\",\"endDate\":\"2026-03-18\""));

        assertThat(shareUrlOf(trip)).endsWith("?v=2");
    }


    @Test
    void settingAndThenRemovingACoverBumpsItTwice() {
        Trip trip = trip();

        rig.uploadCover(trip.owner(), trip.id());
        assertThat(shareUrlOf(trip)).endsWith("?v=2");

        rig.removeCover(trip.owner(), trip.id());
        assertThat(shareUrlOf(trip)).endsWith("?v=3");
    }


    @Test
    void anEditThatChangesNoCardInputDoesNotBumpIt() {
        Trip trip = trip();

        rig.editHeader(
                trip.owner(), trip.id(), header("Trip", "Palawan", "\"description\":\"Just a note\""));

        assertThat(shareUrlOf(trip)).endsWith("?v=1");
    }


    @Test
    void removingACoverThatWasNeverThereDoesNotBumpItButStillRecordsTheEdit() {
        Trip trip = trip();

        rig.removeCover(trip.owner(), trip.id());

        assertThat(shareUrlOf(trip)).endsWith("?v=1");
        assertThat(rig.historyActs(trip.id())).contains("HEADER_EDITED");
    }


    @Test
    void aPlanEditDoesNotBumpIt() {
        Trip trip = trip();
        UUID day = rig.dayAt(trip.id(), 1);

        rig.hold(trip.owner(), trip.id(), "DAY", day);
        rig.addActivity(trip.owner(), trip.id(), day, "Snorkelling");

        assertThat(shareUrlOf(trip)).endsWith("?v=1");
    }


    @Test
    void replacingAnExistingCoverBumpsItAgain() {
        Trip trip = trip();
        rig.uploadCover(trip.owner(), trip.id());
        assertThat(shareUrlOf(trip)).endsWith("?v=2");

        rig.uploadCover(trip.owner(), trip.id());

        assertThat(shareUrlOf(trip)).endsWith("?v=3");
    }


    @Test
    void aChatMessageDoesNotBumpIt() {
        Trip trip = trip();

        rig.send(
                        HttpMethod.POST,
                        "/v1/itineraries/" + trip.id() + "/chat/messages",
                        trip.owner(),
                        "{\"body\":\"anyone booked flights yet\"}")
                .expectStatus()
                .isCreated();

        assertThat(shareUrlOf(trip)).endsWith("?v=1");
    }


    @Test
    void aMembershipArrivalDoesNotBumpIt() {
        Trip trip = trip();

        rig.joinAsMember(trip.owner(), trip.id(), uniqueHandle("joiner"));

        assertThat(shareUrlOf(trip)).endsWith("?v=1");
    }


    @Test
    void aLifecycleTransitionDoesNotBumpIt() {
        Trip trip = trip();

        rig.send(HttpMethod.POST, "/v1/itineraries/" + trip.id() + "/start", trip.owner(), null)
                .expectStatus()
                .isOk();

        assertThat(shareUrlOf(trip)).endsWith("?v=1");
    }


    @Test
    void aBumpedCardStillRendersTheTripsCurrentDataOnEveryVersion() {
        Trip trip = trip();
        rig.editHeader(trip.owner(), trip.id(), header("Renamed", "Palawan", null));
        String token = tokenOf(trip);

        assertThat(previewBody(token)).contains("You&#39;re invited: Renamed");
        assertThat(cardBytes(cardUri(token) + "?v=1")).isEqualTo(cardBytes(cardUri(token) + "?v=2"));
    }


    private record Trip(String id, String owner) {}


    private Trip trip() {
        String owner = rig.travelerWithHandle(uniqueHandle("owner"));
        return new Trip(rig.createTrip(owner, 1), owner);
    }


    private void close(Trip trip) {
        for (String rung : new String[] {"/start", "/complete", "/publish"}) {
            rig.send(HttpMethod.POST, "/v1/itineraries/" + trip.id() + rung, trip.owner(), null)
                    .expectStatus()
                    .isOk();
        }
    }


    private String tokenOf(Trip trip) {
        return fieldIn(linkBody(trip), "token");
    }


    private String shareUrlOf(Trip trip) {
        return fieldIn(linkBody(trip), "shareUrl");
    }


    private byte[] linkBody(Trip trip) {
        return rest.get()
                .uri("/v1/itineraries/" + trip.id() + "/join-link")
                .header(HttpHeaders.AUTHORIZATION, bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .returnResult()
                .getResponseBodyContent();
    }


    private byte[] cardBytes(String uri) {
        return rest.get()
                .uri(uri)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .returnResult()
                .getResponseBodyContent();
    }


    private String previewBody(String token) {
        return new String(
                rest.get()
                        .uri(previewUri(token))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent());
    }


    private static String cardUri(String token) {
        return "/v1/join/" + token + "/card.png";
    }


    private static String previewUri(String token) {
        return "/v1/join/" + token + "/preview";
    }


    private static String contentOf(String page, String tag) {
        String needle = "\"" + tag + "\" content=\"";
        int start = page.indexOf(needle) + needle.length();
        return page.substring(start, page.indexOf('"', start));
    }


    private static String pathOf(String absoluteUrl) {
        int path = absoluteUrl.indexOf("/v1/");
        return absoluteUrl.substring(path);
    }


    private static String header(String title, String destination, String extraFields) {
        String core = "\"title\":\"" + title + "\",\"destination\":\"" + destination + "\"";
        return "{" + (extraFields == null ? core : core + "," + extraFields) + "}";
    }


    private static String uniqueHandle(String role) {
        return role + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
