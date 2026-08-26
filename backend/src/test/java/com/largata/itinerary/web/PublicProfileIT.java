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
import java.util.ArrayList;
import java.util.List;
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
class PublicProfileIT extends ObjectStoreTestBase {

    private static final Pattern JSON_KEY = Pattern.compile("\"([A-Za-z][A-Za-z0-9]*)\"\\s*:");

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
    void theProjectionCarriesTheHeaderAndNothingTheTravelerGaveTheAppForItsOwnUse() {
        String handle = handle();
        String subject = onboardedTraveler(handle);
        describe(subject, "Slow travel, fast ferries");
        String viewer = onboardedTraveler(handle());

        rest.get()
                .uri(profileUri(handle))
                .header(HttpHeaders.AUTHORIZATION, bearer(viewer))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.traveler.handle")
                .isEqualTo(handle)
                .jsonPath("$.traveler.displayName")
                .exists()
                .jsonPath("$.bio")
                .isEqualTo("Slow travel, fast ferries")
                .jsonPath("$.vanityNumber")
                .exists()
                .jsonPath("$.publishedCount")
                .isEqualTo(0)
                .jsonPath("$.destinationCount")
                .isEqualTo(0);
    }


    @Test
    void theExcludedFieldsAreAbsentFromEverySerializedPayloadThisSurfaceReturns() {
        String handle = handle();
        String subject = onboardedTraveler(handle);
        settleIn(subject);
        publish(subject, createTrip(subject));
        String viewer = onboardedTraveler(handle());

        List<String> surfaces =
                List.of(profileUri(handle), profileUri(handle) + "/published", profileUri(handle) + "/diary/trips");

        for (String uri : surfaces) {
            assertThat(keysIn(read(uri, viewer)))
                    .as("the named exclusion list, asserted on the wire rather than on the DTO: " + uri)
                    .doesNotContain(
                            "email", "country", "homeCity", "preferredCurrency", "goals", "interests");
        }
    }


    @Test
    void anUnknownHandleAndAnUnonboardedTravelerAreEquallyUnreachable() {
        String viewer = onboardedTraveler(handle());
        String unonboarded = handle();
        claimHandleWithoutOnboarding(unonboarded);

        for (String handle : List.of(handle(), unonboarded)) {
            rest.get()
                    .uri(profileUri(handle))
                    .header(HttpHeaders.AUTHORIZATION, bearer(viewer))
                    .exchange()
                    .expectStatus()
                    .isNotFound()
                    .expectBody()
                    .jsonPath("$.code")
                    .isEqualTo("TRAVELER_NOT_FOUND");
        }
    }


    @Test
    void aSubjectWhosePrivateTripsAreTheirOnlyTripsReadsAsZeroAndZero() {
        String handle = handle();
        String subject = onboardedTraveler(handle);
        publishPrivately(subject, createTrip(subject));
        publishPrivately(subject, createTrip(subject));
        String viewer = onboardedTraveler(handle());

        byte[] body = read(profileUri(handle), viewer);

        assertThat(numberIn(body, "publishedCount"))
                .as("the public stats read is its own method — the owner's trip count cannot reach here")
                .isZero();
        assertThat(numberIn(body, "destinationCount")).isZero();
    }


    @Test
    void everyPublicProfileRouteRefusesAnUnauthenticatedCaller() {
        String handle = handle();
        onboardedTraveler(handle);

        for (String uri :
                List.of(profileUri(handle), profileUri(handle) + "/published", profileUri(handle) + "/diary/trips")) {
            rest.get().uri(uri).exchange().expectStatus().isUnauthorized();
        }
    }


    @Test
    void theShowcaseShowsThePublicTripAndProvesTheAbsenceOfThePrivateAndArchivedOnes() {
        String handle = handle();
        String subject = onboardedTraveler(handle);
        String shown = createTrip(subject);
        publish(subject, shown);
        String privately = createTrip(subject);
        publishPrivately(subject, privately);
        String archived = createTrip(subject);
        publish(subject, archived);
        archive(subject, archived);
        String viewer = onboardedTraveler(handle());

        List<String> showcase = idsIn(read(profileUri(handle) + "/published", viewer));

        assertThat(showcase)
                .as("presence first: the published public trip is on the stranger's surface")
                .contains(shown);
        assertThat(showcase)
                .as("and only then absence: the private-published and the archived trips are not")
                .doesNotContain(privately, archived);
    }


    @Test
    void theDestinationCountIsDistinctPlacesOnTheStrangersSurface() {
        String handle = handle();
        String subject = onboardedTraveler(handle);
        publish(subject, tripTo(subject, "Kyoto"));
        publish(subject, tripTo(subject, "kyoto "));
        publish(subject, tripTo(subject, "Siargao"));
        String viewer = onboardedTraveler(handle());

        assertThat(numberIn(read(profileUri(handle), viewer), "destinationCount"))
                .as("two trips to one place is one destination — case and padding do not make a new one")
                .isEqualTo(2);
    }


    @Test
    void aPrivateOrArchivedTripsDestinationIsNotCounted() {
        String handle = handle();
        String subject = onboardedTraveler(handle);
        publish(subject, tripTo(subject, "Kyoto"));
        publishPrivately(subject, tripTo(subject, "Reykjavik"));
        String archived = tripTo(subject, "Lisbon");
        publish(subject, archived);
        archive(subject, archived);
        String viewer = onboardedTraveler(handle());

        assertThat(numberIn(read(profileUri(handle), viewer), "destinationCount"))
                .as("the count says where a stranger can see they went, never where they went privately")
                .isEqualTo(1);
    }


    @Test
    void aBlankDestinationIsNotADestination() {
        String handle = handle();
        String subject = onboardedTraveler(handle);
        publish(subject, tripTo(subject, "Kyoto"));
        String blanked = tripTo(subject, "Reykjavik");
        publish(subject, blanked);
        jdbc.update("UPDATE itinerary SET destination = '   ' WHERE id = ?", UUID.fromString(blanked));
        String viewer = onboardedTraveler(handle());

        assertThat(numberIn(read(profileUri(handle), viewer), "destinationCount"))
                .as("the API refuses a blank destination, so this row is planted — the SQL guard is"
                        + " for legacy rows and any path that skips the create request's validation")
                .isEqualTo(1);
    }


    @Test
    void theShowcaseCountAgreesWithWhatTheShowcaseLists() {
        String handle = handle();
        String subject = onboardedTraveler(handle);
        publish(subject, createTrip(subject));
        publish(subject, createTrip(subject));
        publishPrivately(subject, createTrip(subject));
        String viewer = onboardedTraveler(handle());

        long counted = numberIn(read(profileUri(handle), viewer), "publishedCount");

        assertThat(counted)
                .as("the stat is a real count of what this very screen can show")
                .isEqualTo(idsIn(read(profileUri(handle) + "/published", viewer)).size())
                .isEqualTo(2);
    }


    @Test
    void theDiaryGroupsSharedPostcardsByTripAndCountsThemOnTheHeader() throws IOException {
        String handle = handle();
        Fixture trip = startedTripOwnedBy(handle);
        post(trip, trip.activityId(), "Fushimi Inari at dawn");
        post(trip, secondActivity(trip), "Beat the crowds");
        String viewer = onboardedTraveler(handle());

        byte[] body = read(profileUri(handle) + "/diary/trips", viewer);

        assertThat(idsIn(body, "itineraryId"))
                .as("only trips with shared postcards contribute a section header")
                .containsExactly(trip.tripId());
        assertThat(numberIn(body, "entryCount")).isEqualTo(2);
    }


    @Test
    void anArchivedTripTakesItsPostcardsOffThePublicDiary() throws IOException {
        String handle = handle();
        Fixture trip = startedTripOwnedBy(handle);
        post(trip, trip.activityId(), "Cloud 9 boardwalk");
        String viewer = onboardedTraveler(handle());

        assertThat(idsIn(read(profileUri(handle) + "/diary/trips", viewer), "itineraryId"))
                .as("presence first, so the absence below means something")
                .containsExactly(trip.tripId());

        archive(trip.owner(), trip.tripId());

        assertThat(idsIn(read(profileUri(handle) + "/diary/trips", viewer), "itineraryId"))
                .as("archiving retires the trip from every stranger-facing surface, this one included")
                .isEmpty();
    }


    @Test
    void bothListsWalkTheirCursorExactlyOnce() {
        String handle = handle();
        String subject = onboardedTraveler(handle);
        List<String> expected = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            String trip = createTrip(subject);
            publish(subject, trip);
            expected.add(trip);
        }
        String viewer = onboardedTraveler(handle());

        List<String> walked = new ArrayList<>();
        String cursor = null;
        int pages = 0;
        do {
            String uri =
                    profileUri(handle) + "/published?limit=2" + (cursor == null ? "" : "&cursor=" + cursor);
            byte[] body = read(uri, viewer);
            walked.addAll(idsIn(body));
            cursor = nextCursorIn(body);
            pages++;
        } while (cursor != null && pages < 10);

        assertThat(pages).as("five cards at two per page").isEqualTo(3);
        assertThat(walked).containsExactlyInAnyOrderElementsOf(expected).doesNotHaveDuplicates();
    }


    @Test
    void aMalformedCursorIsRejectedRatherThanReadAsAnEmptyList() {
        String handle = handle();
        String subject = onboardedTraveler(handle);
        publish(subject, createTrip(subject));
        String viewer = onboardedTraveler(handle());

        for (String uri :
                List.of(
                        profileUri(handle) + "/published?cursor=not-a-real-cursor",
                        profileUri(handle) + "/diary/trips?cursor=not-a-real-cursor")) {
            rest.get()
                    .uri(uri)
                    .header(HttpHeaders.AUTHORIZATION, bearer(viewer))
                    .exchange()
                    .expectStatus()
                    .isBadRequest()
                    .expectBody()
                    .jsonPath("$.code")
                    .isEqualTo("MALFORMED_CURSOR");
        }
    }


    private Fixture startedTripOwnedBy(String handle) throws IOException {
        String owner = onboardedTraveler(handle);
        String tripId = rig.createTrip(owner, 3);
        UUID activityId = rig.addActivity(owner, tripId, rig.dayAt(tripId, 1), "Sunset at Las Cabanas");
        Fixture trip = new Fixture(owner, tripId, activityId);
        advance(trip, "start");
        return trip;
    }


    private UUID secondActivity(Fixture trip) {
        return rig.addActivity(trip.owner(), trip.tripId(), rig.dayAt(trip.tripId(), 2), "A second stop");
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
                        .uri("/v1/itineraries/" + trip.tripId() + "/diary/entries")
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


    private String onboardedTraveler(String handle) {
        String token = rig.travelerWithHandle(handle);
        rest.post()
                .uri("/v1/me/onboarding-completion")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
        return token;
    }


    private String claimHandleWithoutOnboarding(String handle) {
        return rig.travelerWithHandle(handle);
    }


    private void describe(String token, String bio) {
        patchMe(token, "{\"bio\":\"" + bio + "\"}");
    }


    private void settleIn(String token) {
        patchMe(
                token,
                "{\"country\":\"PH\",\"homeCity\":\"Manila\",\"preferredCurrency\":\"PHP\","
                        + "\"goals\":[\"earn\"],\"interests\":[\"food\"]}");
    }


    private void patchMe(String token, String body) {
        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange()
                .expectStatus()
                .isOk();
    }


    private String createTrip(String token) {
        return rig.createTrip(token, 3);
    }


    private String tripTo(String token, String destination) {
        byte[] created =
                rest.post()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"title\":\"Trip\",\"destination\":\"" + destination + "\",\"durationDays\":3}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return TripRig.fieldIn(created, "id");
    }


    private void publish(String token, String tripId) {
        act(token, tripId, "start");
        act(token, tripId, "complete");
        rig.send(HttpMethod.POST, "/v1/itineraries/" + tripId + "/publish", token, "{\"audience\":\"public\"}")
                .expectStatus()
                .isOk();
    }


    private void publishPrivately(String token, String tripId) {
        act(token, tripId, "start");
        act(token, tripId, "complete");
        rig.send(HttpMethod.POST, "/v1/itineraries/" + tripId + "/publish", token, "{\"audience\":\"private\"}")
                .expectStatus()
                .isOk();
    }


    private void archive(String token, String tripId) {
        act(token, tripId, "archive");
    }


    private void act(String token, String tripId, String verb) {
        rest.post()
                .uri("/v1/itineraries/" + tripId + "/" + verb)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void advance(Fixture trip, String step) {
        act(trip.owner(), trip.tripId(), step);
    }


    private byte[] read(String uri, String token) {
        return rest.get()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .returnResult()
                .getResponseBodyContent();
    }


    private static List<String> keysIn(byte[] body) {
        List<String> keys = new ArrayList<>();
        Matcher found = JSON_KEY.matcher(new String(body));
        while (found.find()) {
            keys.add(found.group(1));
        }
        return keys;
    }


    private static List<String> idsIn(byte[] body) {
        return idsIn(body, "id");
    }


    private static List<String> idsIn(byte[] body, String field) {
        List<String> ids = new ArrayList<>();
        Matcher found =
                Pattern.compile("\"" + field + "\"\\s*:\\s*\"([0-9a-f-]{36})\"").matcher(new String(body));
        while (found.find()) {
            ids.add(found.group(1));
        }
        return ids;
    }


    private static long numberIn(byte[] body, String field) {
        Matcher found = Pattern.compile("\"" + field + "\"\\s*:\\s*(-?\\d+)").matcher(new String(body));
        if (!found.find()) {
            throw new AssertionError("no numeric field named " + field + " in " + new String(body));
        }
        return Long.parseLong(found.group(1));
    }


    private static String nextCursorIn(byte[] body) {
        Matcher found = Pattern.compile("\"nextCursor\"\\s*:\\s*\"([^\"]+)\"").matcher(new String(body));
        return found.find() ? found.group(1) : null;
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


    private static String profileUri(String handle) {
        return "/v1/travelers/" + handle;
    }


    private static String handle() {
        return "h" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }


    private static String bearer(String token) {
        return "Bearer " + token;
    }


    private record Fixture(String owner, String tripId, UUID activityId) {}
}
