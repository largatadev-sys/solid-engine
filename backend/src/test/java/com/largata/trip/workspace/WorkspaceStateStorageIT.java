package com.largata.trip.workspace;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.trip.api.Membership;
import com.largata.trip.api.Role;
import com.largata.trip.trip.entity.Trip;
import com.largata.support.PostgresTestBase;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import com.largata.trip.trip.service.TripService;
import com.largata.trip.workspace.service.WorkspaceService;
import com.largata.trip.workspace.entity.WorkspaceState;


@SpringBootTest
class WorkspaceStateStorageIT extends PostgresTestBase {

    @Autowired private TripService itineraries;
    @Autowired private WorkspaceService workspaces;
    @Autowired private JdbcTemplate jdbc;


    @Test
    void aNewWorkspaceStoresTheEnumNameNotItsWireForm() {
        Trip trip = createTrip();

        assertThat(storedState(trip.id()))
                .as("@Enumerated(STRING) writes the name; V13's backfill and any future SQL depend on it")
                .isEqualTo("ACTIVE");
    }


    @Test
    void aCompletedTripsRoomStaysOpen_becauseTheLifecycleIsNotTheWorkspacesFactToStore() {
        Trip trip = createTrip();
        UUID owner = trip.ownerId();

        itineraries.start(ownerOf(trip, owner));
        itineraries.complete(ownerOf(trip, owner));

        assertThat(storedState(trip.id()))
                .as("TW-2: COMPLETED was a stored copy of the ITINERARY's lifecycle, written as a"
                        + " side effect of a transition that had no business writing here. The room"
                        + " of a completed trip is open — members still chat, poll and post — and"
                        + " the wire still answers `completed` by projecting the lifecycle beside it")
                .isEqualTo("ACTIVE");
        assertThat(workspaces.stateOf(trip.id())).contains(WorkspaceState.ACTIVE);
    }


    @Test
    void theStateColumnHasNoDefaultAndIsNotNullable() {
        assertThat(
                        jdbc.queryForObject(
                                """
                                SELECT column_default FROM information_schema.columns
                                 WHERE table_name = 'workspace' AND column_name = 'state'
                                """,
                                String.class))
                .as("no default, deliberately — V13's note carries the reasoning")
                .isNull();

        assertThat(
                        jdbc.queryForObject(
                                """
                                SELECT is_nullable FROM information_schema.columns
                                 WHERE table_name = 'workspace' AND column_name = 'state'
                                """,
                                String.class))
                .as("a null state would read as 'not archived' and silently unfreeze a trip")
                .isEqualTo("NO");
    }

    private Trip createTrip() {
        return itineraries.create(UUID.randomUUID(), "Osaka in spring", "Osaka", null, null);
    }


    private Membership ownerOf(Trip trip, UUID travelerId) {
        return new Membership(travelerId, trip.id(), Role.OWNER);
    }

    private String storedState(UUID itineraryId) {
        return jdbc.queryForObject(
                "SELECT state FROM workspace WHERE itinerary_id = ?", String.class, itineraryId);
    }
}
