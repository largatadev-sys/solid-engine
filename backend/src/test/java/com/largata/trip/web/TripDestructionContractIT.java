package com.largata.trip.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.common.storage.ObjectStore;
import com.largata.support.ObjectStoreTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Instant;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class TripDestructionContractIT extends ObjectStoreTestBase {

    private RestTestClient rest;
    private TripRig rig;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @Autowired private ObjectStore store;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        rig = new TripRig(rest, jdbc);
    }


    @Test
    void theOwnerDestroysTheWorkspaceWorldAndEveryContentObjectStands() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        UUID tripId = UUID.fromString(trip);
        UUID activity = rig.addActivity(owner, trip, rig.dayAt(trip, 1), "Snapshotted forever");
        String member = rig.joinAsMember(owner, trip, handle());
        UUID memberId = rig.travelerIdOf(member);
        rig.uploadCover(owner, trip);
        dumpPhoto(owner, trip);
        chat(member, trip, "This thread dies with the trip");
        poll(owner, trip);
        pendingInvitation(owner, trip);
        joinLink(owner, trip);
        offerOwnership(owner, trip, memberId);
        act(owner, trip, "start");
        oldWorldDiaryEntry(member, trip, activity);
        byte[] postcardCreated = postcardFromActivity(member, trip, activity);
        String postcardId = TripRig.fieldIn(postcardCreated, "id");
        String diaryId = TripRig.fieldIn(postcardCreated, "diaryId");
        act(owner, trip, "complete");
        String objectId = publish(owner, trip);
        String forker = rig.travelerWithHandle(handle());
        String forkedTrip = fork(forker, trip);
        UUID workspaceId =
                jdbc.queryForObject(
                        "SELECT id FROM workspace WHERE itinerary_id = ?", UUID.class, tripId);
        List<String> workspaceKeys =
                jdbc.queryForList(
                        "SELECT storage_key FROM photo WHERE subject_kind IN"
                                + " ('ITINERARY_COVER', 'ITINERARY_PHOTO_DUMP') AND subject_id = ?",
                        String.class,
                        tripId);
        assertThat(workspaceKeys).hasSize(2);
        workspaceKeys.forEach(key -> assertThat(store.get(key)).as("stored before the delete").isPresent());

        rest.delete()
                .uri("/v1/trips/" + trip)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isNoContent();

        for (String byItinerary :
                new String[] {
                    "SELECT count(*) FROM itinerary WHERE id = ?",
                    "SELECT count(*) FROM day WHERE itinerary_id = ?",
                    "SELECT count(*) FROM edit_lease WHERE itinerary_id = ?",
                    "SELECT count(*) FROM activity_history WHERE itinerary_id = ?",
                    "SELECT count(*) FROM chat_message WHERE itinerary_id = ?",
                    "SELECT count(*) FROM workspace WHERE itinerary_id = ?",
                    "SELECT count(*) FROM photo WHERE subject_kind IN"
                            + " ('ITINERARY_COVER', 'ITINERARY_PHOTO_DUMP') AND subject_id = ?"
                }) {
            assertThat(jdbc.queryForObject(byItinerary, Integer.class, tripId))
                    .as(byItinerary)
                    .isZero();
        }
        for (String workspaceTable :
                new String[] {
                    "membership", "invitation", "join_link", "join_request", "poll",
                    "ownership_offer", "ownership_transfer"
                }) {
            assertThat(
                            jdbc.queryForObject(
                                    "SELECT count(*) FROM " + workspaceTable
                                            + " WHERE workspace_id = ?",
                                    Integer.class,
                                    workspaceId))
                    .as("no %s row of this workspace survives", workspaceTable)
                    .isZero();
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM activity WHERE id = ?", Integer.class, activity))
                .isZero();
        workspaceKeys.forEach(
                key ->
                        assertThat(store.get(key))
                                .as("the workspace world's stored objects are gone: " + key)
                                .isEmpty());

        rest.get()
                .uri("/v1/publications/" + objectId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(member))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.plan.days[0].activities[0].title")
                .isEqualTo("Snapshotted forever");
        rest.get()
                .uri("/v1/postcards/" + postcardId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(member))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.tripId")
                .isEqualTo(trip)
                .jsonPath("$.activityTitle")
                .isEqualTo("Snapshotted forever");
        rest.get()
                .uri("/v1/diaries/" + diaryId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(member))
                .exchange()
                .expectStatus()
                .isOk();
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM diary_entry WHERE itinerary_id = ?",
                                Integer.class,
                                tripId))
                .as("the old world's entries survive the destruction")
                .isEqualTo(1);
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM itinerary WHERE id = ?",
                                Integer.class,
                                UUID.fromString(forkedTrip)))
                .as("the forked copy survives")
                .isEqualTo(1);
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM fork_relationship WHERE forked_itinerary_id = ?",
                                Integer.class,
                                UUID.fromString(forkedTrip)))
                .as("the fork provenance survives")
                .isEqualTo(1);

        rest.delete()
                .uri("/v1/trips/" + trip)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("TRIP_NOT_FOUND");
    }


    @Test
    void destructionWorksFromTheArchivedStateToo() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        rest.post()
                .uri("/v1/itineraries/" + trip + "/archive")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();

        rest.delete()
                .uri("/v1/trips/" + trip)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isNoContent();
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM itinerary WHERE id = ?",
                                Integer.class,
                                UUID.fromString(trip)))
                .isZero();
    }


    @Test
    void aMemberIsRefusedByNameAndAStrangerSeesNothing() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        String member = rig.joinAsMember(owner, trip, handle());
        String stranger = rig.travelerWithHandle(handle());

        rest.delete()
                .uri("/v1/trips/" + trip)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(member))
                .exchange()
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
        rest.delete()
                .uri("/v1/trips/" + trip)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("TRIP_NOT_FOUND");
        rest.get()
                .uri("/v1/trips/" + trip)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void act(String token, String trip, String act) {
        rest.post()
                .uri("/v1/itineraries/" + trip + "/" + act)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void chat(String token, String trip, String body) {
        rest.post()
                .uri("/v1/itineraries/" + trip + "/chat/messages")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"body\":\"" + body + "\"}")
                .exchange()
                .expectStatus()
                .isCreated();
    }


    private void poll(String token, String trip) {
        rest.post()
                .uri("/v1/itineraries/" + trip + "/polls")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(
                        "{\"question\":\"Dies with the workspace?\",\"options\":[\"Yes\",\"Also yes\"],"
                                + "\"closesAt\":\""
                                + Instant.now().plusSeconds(3600)
                                + "\"}")
                .exchange()
                .expectStatus()
                .isCreated();
    }


    private void pendingInvitation(String token, String trip) {
        rest.post()
                .uri("/v1/itineraries/" + trip + "/invitations")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"email\":\"never-answers-" + UUID.randomUUID() + "@example.com\"}")
                .exchange()
                .expectStatus()
                .isCreated();
    }


    private void joinLink(String token, String trip) {
        rest.get()
                .uri("/v1/itineraries/" + trip + "/join-link")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void offerOwnership(String token, String trip, UUID travelerId) {
        rest.post()
                .uri("/v1/itineraries/" + trip + "/ownership-offer")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"travelerId\":\"" + travelerId + "\"}")
                .exchange()
                .expectStatus()
                .isCreated();
    }


    private void dumpPhoto(String token, String trip) {
        MultipartBodyBuilder parts = new MultipartBodyBuilder();
        parts.part("photo", new ByteArrayResource(jpeg()) {
                    @Override
                    public String getFilename() {
                        return "dump.jpg";
                    }
                })
                .contentType(MediaType.IMAGE_JPEG);
        rest.post()
                .uri("/v1/itineraries/" + trip + "/photo-dump")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(parts.build())
                .exchange()
                .expectStatus()
                .isCreated();
    }


    private void oldWorldDiaryEntry(String token, String trip, UUID activity) {
        MultipartBodyBuilder parts = new MultipartBodyBuilder();
        parts.part("entry", "{\"activityId\":\"" + activity + "\",\"caption\":\"Old world telling\"}")
                .contentType(MediaType.APPLICATION_JSON);
        parts.part("photos", new ByteArrayResource(jpeg()) {
                    @Override
                    public String getFilename() {
                        return "entry.jpg";
                    }
                })
                .contentType(MediaType.IMAGE_JPEG);
        rest.post()
                .uri("/v1/itineraries/" + trip + "/diary/entries")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(parts.build())
                .exchange()
                .expectStatus()
                .isCreated();
    }


    private byte[] postcardFromActivity(String token, String trip, UUID activity) {
        MultipartBodyBuilder parts = new MultipartBodyBuilder();
        parts.part("postcard", "{\"caption\":\"New world telling\"}")
                .contentType(MediaType.APPLICATION_JSON);
        parts.part("photos", new ByteArrayResource(jpeg()) {
                    @Override
                    public String getFilename() {
                        return "postcard.jpg";
                    }
                })
                .contentType(MediaType.IMAGE_JPEG);
        return rest.post()
                .uri("/v1/trips/" + trip + "/activities/" + activity + "/postcards")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(parts.build())
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .returnResult()
                .getResponseBodyContent();
    }


    private String publish(String owner, String trip) {
        return TripRig.fieldIn(
                rest.post()
                        .uri("/v1/trips/" + trip + "/publish")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"audience\":\"public\"}")
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "id");
    }


    private String fork(String token, String trip) {
        return TripRig.fieldIn(
                rest.post()
                        .uri("/v1/itineraries/" + trip + "/fork")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "id");
    }


    private static byte[] jpeg() {
        BufferedImage photo = new BufferedImage(320, 240, BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < photo.getHeight(); y++) {
            for (int x = 0; x < photo.getWidth(); x++) {
                photo.setRGB(x, y, (x * 19 + y * 11) & 0xFFFFFF);
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
}
