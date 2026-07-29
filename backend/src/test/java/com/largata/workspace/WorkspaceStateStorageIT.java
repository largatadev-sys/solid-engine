package com.largata.workspace;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.common.authz.Membership;
import com.largata.common.authz.Role;
import com.largata.itinerary.Itinerary;
import com.largata.itinerary.ItineraryService;
import com.largata.support.PostgresTestBase;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;


@SpringBootTest
class WorkspaceStateStorageIT extends PostgresTestBase {

    @Autowired private ItineraryService itineraries;
    @Autowired private WorkspaceService workspaces;
    @Autowired private JdbcTemplate jdbc;


    @Test
    void aNewWorkspaceStoresTheEnumNameNotItsWireForm() {
        Itinerary trip = createTrip();

        assertThat(storedState(trip.id()))
                .as("@Enumerated(STRING) writes the name; V13's backfill and any future SQL depend on it")
                .isEqualTo("ACTIVE");
    }


    @Test
    void aCompletedTripsWorkspaceStoresCOMPLETED() {
        Itinerary trip = createTrip();
        UUID owner = trip.ownerId();

        itineraries.start(ownerOf(trip, owner));
        itineraries.complete(ownerOf(trip, owner));

        assertThat(storedState(trip.id())).isEqualTo("COMPLETED");
        assertThat(workspaces.stateOf(trip.id())).contains(WorkspaceState.COMPLETED);
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

    private Itinerary createTrip() {
        return itineraries.create(UUID.randomUUID(), "Osaka in spring", java.util.List.of("Osaka"), null, null);
    }


    private Membership ownerOf(Itinerary trip, UUID travelerId) {
        return new Membership(travelerId, trip.id(), Role.OWNER);
    }

    private String storedState(UUID itineraryId) {
        return jdbc.queryForObject(
                "SELECT state FROM workspace WHERE itinerary_id = ?", String.class, itineraryId);
    }
}
