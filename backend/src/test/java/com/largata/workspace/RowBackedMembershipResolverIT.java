package com.largata.workspace;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.ItineraryNotFoundException;
import com.largata.common.authz.Membership;
import com.largata.common.authz.Role;
import com.largata.itinerary.Itinerary;
import com.largata.itinerary.ItineraryService;
import com.largata.support.PostgresTestBase;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;


@SpringBootTest
class RowBackedMembershipResolverIT extends PostgresTestBase {

    @Autowired private AuthorizationGuard guard;
    @Autowired private ItineraryService itineraries;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void theCreatorResolvesToOwnerFromTheirMembershipRow() {
        UUID ana = UUID.randomUUID();
        Itinerary trip = itineraries.create(ana, "Osaka", "Osaka", null, null);

        Membership membership = guard.requireMember(ana, trip.id());

        assertThat(membership.role()).isEqualTo(Role.OWNER);
        assertThat(membership.isOwner()).isTrue();
        assertThat(membership.travelerId()).isEqualTo(ana);
        assertThat(membership.itineraryId())
                .as("the guard's vocabulary is the itinerary; the workspace id stays inside the module")
                .isEqualTo(trip.id());
    }


    @Test
    void aSeededMemberRowResolvesToMember() {
        UUID ana = UUID.randomUUID();
        UUID ben = UUID.randomUUID();
        Itinerary trip = itineraries.create(ana, "Kyoto", "Kyoto", null, null);
        joinAsMember(trip.id(), ben);

        Membership membership = guard.requireMember(ben, trip.id());

        assertThat(membership.role()).isEqualTo(Role.MEMBER);
        assertThat(membership.isOwner()).as("a member is not an owner — S1.5/S1.6 will lean on this").isFalse();
        assertThat(membership.travelerId()).isEqualTo(ben);
        assertThat(membership.itineraryId()).isEqualTo(trip.id());
    }

    @Test
    void aStrangerHasNoStanding() {
        UUID ana = UUID.randomUUID();
        Itinerary trip = itineraries.create(ana, "Nara", "Nara", null, null);

        assertThatThrownBy(() -> guard.requireMember(UUID.randomUUID(), trip.id()))
                .isInstanceOf(ItineraryNotFoundException.class);
    }


    @Test
    void aNonexistentItineraryRejectsIdenticallyToSomeoneElses() {
        UUID ana = UUID.randomUUID();
        UUID ben = UUID.randomUUID();
        Itinerary anasTrip = itineraries.create(ana, "Sapporo", "Sapporo", null, null);

        Throwable someoneElses =
                org.assertj.core.api.Assertions.catchThrowable(() -> guard.requireMember(ben, anasTrip.id()));
        Throwable nonexistent =
                org.assertj.core.api.Assertions.catchThrowable(
                        () -> guard.requireMember(ben, UUID.randomUUID()));

        assertThat(someoneElses).isInstanceOf(ItineraryNotFoundException.class);
        assertThat(nonexistent).isInstanceOf(ItineraryNotFoundException.class);
        assertThat(nonexistent.getClass()).isEqualTo(someoneElses.getClass());
        assertThat(nonexistent.getMessage()).isEqualTo(someoneElses.getMessage());
    }


    @Test
    void anItineraryWithNoWorkspaceIsInvisibleEvenToItsOwner() {
        UUID ana = UUID.randomUUID();
        UUID orphanedTrip = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO itinerary (id, owner_id, title, destination, standouts, state, published,"
                        + " created_at) VALUES (?, ?, 'Pre-E1 leftover', ?, '{}', 'DRAFT', false, ?)",
                orphanedTrip,
                ana,
                "nowhere",
                Timestamp.from(Instant.now()));

        assertThatThrownBy(() -> guard.requireMember(ana, orphanedTrip))
                .as("no row, no standing — loudly, rather than a silent fallback to owner_id")
                .isInstanceOf(ItineraryNotFoundException.class);
    }

    private void joinAsMember(UUID itineraryId, UUID travelerId) {
        UUID workspaceId =
                jdbc.queryForObject("SELECT id FROM workspace WHERE itinerary_id = ?", UUID.class, itineraryId);
        jdbc.update(
                "INSERT INTO membership (workspace_id, traveler_id, role, joined_at) VALUES (?, ?, 'MEMBER', ?)",
                workspaceId,
                travelerId,
                Timestamp.from(Instant.now()));
    }
}
