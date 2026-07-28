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

/**
 * The contract between {@link WorkspaceState} and the {@code workspace.state} column (S1.9 ticket 01,
 * spec AC 10) — the same pin {@link MembershipStorageIT} holds for {@code membership.role}, for the
 * same reason.
 *
 * <p><strong>Why a storage test for a column nobody indexes yet.</strong> S1.9's write fence reads
 * this value, and the moment any SQL names it — a partial index on archived trips, a reporting query,
 * a future migration's {@code WHERE} — the spelling becomes a contract between Hibernate and the
 * database. V4's near-miss is the precedent: {@code WHERE role = 'owner'} would have created cleanly,
 * cost nothing, and enforced nothing. A wrong spelling here fails no other test in the suite.
 *
 * <p>It also pins the <em>absence</em> of a column default, which is V13's deliberate choice and the
 * direct inheritance of V3's dead {@code DEFAULT 'draft'} — dropped at V12 after sitting in the schema
 * for nine migrations as a trap for whoever copied it.
 */
@SpringBootTest
class WorkspaceStateStorageIT extends PostgresTestBase {

    @Autowired private ItineraryService itineraries;
    @Autowired private WorkspaceService workspaces;
    @Autowired private JdbcTemplate jdbc;

    /**
     * A freshly-formed workspace stores the enum's <strong>name</strong>, upper-case — not {@code
     * wireName()}'s lower-case form, and not an ordinal.
     */
    @Test
    void aNewWorkspaceStoresTheEnumNameNotItsWireForm() {
        Itinerary trip = createTrip();

        assertThat(storedState(trip.id()))
                .as("@Enumerated(STRING) writes the name; V13's backfill and any future SQL depend on it")
                .isEqualTo("ACTIVE");
    }

    /** The mirror's spelling, which is the one V13's backfill CASE arm has to match exactly. */
    @Test
    void aCompletedTripsWorkspaceStoresCOMPLETED() {
        Itinerary trip = createTrip();
        UUID owner = trip.ownerId();

        itineraries.start(ownerOf(trip, owner));
        itineraries.complete(ownerOf(trip, owner));

        assertThat(storedState(trip.id())).isEqualTo("COMPLETED");
        assertThat(workspaces.stateOf(trip.id())).contains(WorkspaceState.COMPLETED);
    }

    /**
     * <strong>No column default</strong> (V13). Every INSERT path supplies the value — {@code
     * Workspace}'s constructor for new rows, the backfill for old ones — so a default would be dead
     * weight, and dead defaults in this schema have a history: V3's lower-case {@code 'draft'} was
     * never once applied and still nearly cost S1.1 a zero-matching partial index.
     */
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

    /** The guard's capability object, minted directly — this test is about storage, not authorization. */
    private Membership ownerOf(Itinerary trip, UUID travelerId) {
        return new Membership(travelerId, trip.id(), Role.OWNER);
    }

    private String storedState(UUID itineraryId) {
        return jdbc.queryForObject(
                "SELECT state FROM workspace WHERE itinerary_id = ?", String.class, itineraryId);
    }
}
