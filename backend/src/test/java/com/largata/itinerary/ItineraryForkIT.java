package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class ItineraryForkIT extends PostgresTestBase {

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
    void forkingCopiesTheItineraryTheForkerIsReading_notThePlanItsOwnerHasSinceChanged() {
        String author = rig.travelerWithHandle(handle());
        String forker = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(author, 1);
        rig.addActivity(author, trip, rig.dayAt(trip, 1), "As it was when published");
        walkToCompleted(author, trip);
        String objectId = publish(author, trip);

        unpublish(author, trip);
        rig.hold(author, trip, "header", UUID.fromString(trip));
        rest.patch()
                .uri("/v1/trips/" + trip)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"title\":\"Changed after the fork was read\",\"destination\":\"Palawan\"}")
                .exchange()
                .expectStatus()
                .isOk();
        rig.releaseLease(author, trip, "header", UUID.fromString(trip)).expectStatus().isNoContent();
        publish(author, trip);

        String forked = fork(forker, objectId);

        readTrip(forker, forked)
                .jsonPath("$.title")
                .isEqualTo("Changed after the fork was read")
                .jsonPath("$.published")
                .isEqualTo(false)
                .jsonPath("$.state")
                .isEqualTo("upcoming")
                .jsonPath("$.days.length()")
                .isEqualTo(1)
                .jsonPath("$.days[0].activities[0].title")
                .isEqualTo("As it was when published");
    }


    @Test
    void theForkIsPlanOnlyAndTheForkerIsItsSoleOwner() {
        String author = rig.travelerWithHandle(handle());
        String forker = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(author, 2);
        walkToCompleted(author, trip);
        String objectId = publish(author, trip);

        String forked = fork(forker, objectId);

        readTrip(forker, forked)
                .jsonPath("$.startDate")
                .doesNotExist()
                .jsonPath("$.endDate")
                .doesNotExist()
                .jsonPath("$.coverImageUrl")
                .doesNotExist()
                .jsonPath("$.published")
                .isEqualTo(false);

        assertThat(memberCountOf(forked)).isEqualTo(1);
        assertThat(ownerOf(forked)).isEqualTo(rig.travelerIdOf(forker).toString());
    }


    @Test
    void theProvenanceRowNamesTheItineraryAndThePageCountsTheForkByItsOwnId() {
        String author = rig.travelerWithHandle(handle());
        String forker = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(author, 1);
        walkToCompleted(author, trip);
        String objectId = publish(author, trip);

        page(author, objectId).jsonPath("$.forkCount").isEqualTo(0);

        String forked = fork(forker, objectId);

        assertThat(sourceOfForkOf(forked)).isEqualTo(objectId);
        page(author, objectId).jsonPath("$.forkCount").isEqualTo(1);
    }


    @Test
    void aRetiredItineraryAnswersNotFoundToAFork() {
        String author = rig.travelerWithHandle(handle());
        String forker = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(author, 1);
        walkToCompleted(author, trip);
        String objectId = publish(author, trip);
        unpublish(author, trip);

        forkRaw(forker, objectId).expectStatus().isNotFound();
    }


    @Test
    void anArchiveMaskedItineraryAnswersNotFoundToAStrangersFork() {
        String author = rig.travelerWithHandle(handle());
        String forker = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(author, 1);
        walkToCompleted(author, trip);
        String objectId = publish(author, trip);

        rest.post()
                .uri("/v1/trips/" + trip + "/archive")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isOk();

        forkRaw(forker, objectId).expectStatus().isNotFound();
    }


    @Test
    void aPrivateOwnersItineraryIsForkableByAStranger_becausePublishedMeansPublic() {
        String author = rig.travelerWithHandle(handle());
        String forker = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(author, 1);
        walkToCompleted(author, trip);
        String objectId = publish(author, trip);

        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"profileVisibility\":\"private\"}")
                .exchange()
                .expectStatus()
                .isOk();

        String forked = fork(forker, objectId);
        readTrip(forker, forked).jsonPath("$.id").isEqualTo(forked);
    }


    private String sourceOfForkOf(String forkedTripId) {
        return jdbc.queryForObject(
                "SELECT source_itinerary_id::text FROM fork_relationship"
                        + " WHERE forked_itinerary_id = ?::uuid",
                String.class,
                forkedTripId);
    }


    private String ownerOf(String tripId) {
        return jdbc.queryForObject(
                "SELECT owner_id::text FROM itinerary WHERE id = ?::uuid", String.class, tripId);
    }


    private Long memberCountOf(String tripId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM membership m JOIN workspace w ON w.id = m.workspace_id"
                        + " WHERE w.itinerary_id = ?::uuid",
                Long.class,
                tripId);
    }


    private String fork(String token, String objectId) {
        return TripRig.fieldIn(
                forkRaw(token, objectId)
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "id");
    }


    private RestTestClient.ResponseSpec forkRaw(String token, String objectId) {
        return rest.post()
                .uri("/v1/itineraries/" + objectId + "/fork")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange();
    }


    private RestTestClient.BodyContentSpec page(String token, String objectId) {
        return rest.get()
                .uri("/v1/itineraries/" + objectId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody();
    }


    private RestTestClient.BodyContentSpec readTrip(String token, String trip) {
        return rest.get()
                .uri("/v1/trips/" + trip)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody();
    }


    private String publish(String owner, String trip) {
        return TripRig.fieldIn(
                rest.post()
                        .uri("/v1/trips/" + trip + "/publish")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "id");
    }


    private void unpublish(String owner, String trip) {
        rest.post()
                .uri("/v1/trips/" + trip + "/unpublish")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isNoContent();
    }


    private void walkToCompleted(String owner, String trip) {
        for (String act : new String[] {"start", "complete"}) {
            rest.post()
                    .uri("/v1/trips/" + trip + "/" + act)
                    .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                    .exchange()
                    .expectStatus()
                    .isOk();
        }
    }


    private static String handle() {
        return "t" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }
}
