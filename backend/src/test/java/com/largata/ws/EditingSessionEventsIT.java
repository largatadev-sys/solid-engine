package com.largata.ws;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.itinerary.TripsTopic;
import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import com.largata.support.WsRig;
import com.largata.support.WsTestClient;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
@ActiveProfiles("dev")
class EditingSessionEventsIT extends PostgresTestBase {

    private static final Duration SILENCE = Duration.ofMillis(750);

    private static final String SESSION = "SESSION";

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @Autowired private ObjectMapper json;

    private RestTestClient rest;
    private TripRig tripRig;
    private WsRig rig;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        tripRig = new TripRig(rest, jdbc);
        rig = new WsRig(rest, port);
    }

    @Test
    void aCoMembersEditingSessionReachesTheOtherMembersTravelerTopic() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("edso" + tag);
        String trip = tripRig.createTrip(owner, 2);
        String watcher = tripRig.joinAsMember(owner, trip, "edsw" + tag);
        UUID watcherId = tripRig.travelerIdOf(watcher);

        try (WsTestClient theirs = rig.connectAs(watcher)) {
            subscribeAsTraveler(theirs, watcherId);

            tripRig.hold(owner, trip, SESSION, UUID.fromString(trip));

            JsonNode envelope = json.readTree(theirs.awaitFrame());
            assertThat(envelope.path("type").asString()).isEqualTo(TripsTopic.EDITING_SESSION_ACQUIRED);
            assertThat(envelope.path("payload").path("itineraryId").asString()).isEqualTo(trip);
            assertThat(envelope.path("payload").path("editingSession").path("travelerId").asString())
                    .as("The frame carries a payload so the client absorbs it into the cached trip"
                            + " with zero queries — the holder is who the 'being edited by…' card"
                            + " names, so it must be on the wire.")
                    .isEqualTo(tripRig.travelerIdOf(owner).toString());
        }
    }

    @Test
    void releasingTheSessionClearsTheCardWithAContentlessHolder() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("edro" + tag);
        String trip = tripRig.createTrip(owner, 2);
        String watcher = tripRig.joinAsMember(owner, trip, "edrw" + tag);
        UUID watcherId = tripRig.travelerIdOf(watcher);

        try (WsTestClient theirs = rig.connectAs(watcher)) {
            subscribeAsTraveler(theirs, watcherId);
            tripRig.hold(owner, trip, SESSION, UUID.fromString(trip));
            assertThat(theirs.awaitFrame()).contains(TripsTopic.EDITING_SESSION_ACQUIRED);

            tripRig.releaseLease(owner, trip, SESSION, UUID.fromString(trip)).expectStatus().isNoContent();

            JsonNode envelope = json.readTree(theirs.awaitFrame());
            assertThat(envelope.path("type").asString()).isEqualTo(TripsTopic.EDITING_SESSION_RELEASED);
            assertThat(envelope.path("payload").path("editingSession").isNull())
                    .as("A released session names nobody. The client writes this straight over the"
                            + " cached trip's editingSession, so a stale holder here would leave the"
                            + " card up forever.")
                    .isTrue();
        }
    }

    @Test
    void aRefusedAcquisitionBroadcastsNothingBecauseTheWriteNeverCommitted() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("edfo" + tag);
        String trip = tripRig.createTrip(owner, 2);
        String rival = tripRig.joinAsMember(owner, trip, "edfr" + tag);
        String watcher = tripRig.joinAsMember(owner, trip, "edfw" + tag);
        UUID watcherId = tripRig.travelerIdOf(watcher);

        tripRig.hold(owner, trip, SESSION, UUID.fromString(trip));

        try (WsTestClient theirs = rig.connectAs(watcher)) {
            subscribeAsTraveler(theirs, watcherId);

            tripRig.acquire(rival, trip, SESSION, UUID.fromString(trip)).expectStatus().isEqualTo(409);

            assertThat(theirs.receivedNothingWithin(SILENCE))
                    .as("A refused acquisition changes nothing, so it must announce nothing. The"
                            + " holder is established first and a rival then loses, so silence here"
                            + " means the failed path stayed quiet rather than that nothing happened.")
                    .isTrue();
        }
    }

    @Test
    void aNonMemberNeverSeesAnotherTripsEditingSession() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("edno" + tag);
        String trip = tripRig.createTrip(owner, 2);
        String stranger = tripRig.travelerWithHandle("edns" + tag);
        UUID strangerId = tripRig.travelerIdOf(stranger);

        try (WsTestClient theirs = rig.connectAs(stranger)) {
            subscribeAsTraveler(theirs, strangerId);

            tripRig.hold(owner, trip, SESSION, UUID.fromString(trip));

            assertThat(theirs.receivedNothingWithin(SILENCE))
                    .as("The traveler topic fans in only the trips you belong to. A stranger holding"
                            + " their own topic must learn nothing about a trip they are not on.")
                    .isTrue();
        }
    }

    private void subscribeAsTraveler(WsTestClient client, UUID travelerId) throws Exception {
        client.send(WsRig.subscribeTo("traveler:" + travelerId));
        assertThat(client.awaitFrame()).contains("\"subscribed\"");
    }
}
