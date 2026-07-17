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

/**
 * The guard, reading from membership rows (S1.1, AC 3/4).
 *
 * <p>The regression half of AC 3 — creator sees, stranger 404s, no token 401s — is proven by S0.3's
 * own tests passing unmodified ({@code ItineraryContractIT}, {@code AuthorizationGuardTest}), which
 * is stronger evidence than anything this class could add: they were written against the owner
 * resolver and never touched. What this class adds is the part S0.3 could not express — the {@code
 * MEMBER} role, which had no way to exist until now.
 */
@SpringBootTest
class RowBackedMembershipResolverIT extends PostgresTestBase {

    @Autowired private AuthorizationGuard guard;
    @Autowired private ItineraryService itineraries;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void theCreatorResolvesToOwnerFromTheirMembershipRow() {
        UUID ana = UUID.randomUUID();
        Itinerary trip = itineraries.create(ana, "Osaka", List.of("Osaka"), null, null);

        Membership membership = guard.requireMember(ana, trip.id());

        assertThat(membership.role()).isEqualTo(Role.OWNER);
        assertThat(membership.isOwner()).isTrue();
        assertThat(membership.travelerId()).isEqualTo(ana);
        assertThat(membership.itineraryId())
                .as("the guard's vocabulary is the itinerary; the workspace id stays inside the module")
                .isEqualTo(trip.id());
    }

    /**
     * AC 4 — <strong>the contract S1.2 stands on</strong>. No service creates a {@code MEMBER} until
     * invites land, so the row is seeded directly: the point is that the guard already resolves it
     * correctly, and the invite story inherits a proven path rather than discovering one.
     */
    @Test
    void aSeededMemberRowResolvesToMember() {
        UUID ana = UUID.randomUUID();
        UUID ben = UUID.randomUUID();
        Itinerary trip = itineraries.create(ana, "Kyoto", List.of("Kyoto"), null, null);
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
        Itinerary trip = itineraries.create(ana, "Nara", List.of("Nara"), null, null);

        assertThatThrownBy(() -> guard.requireMember(UUID.randomUUID(), trip.id()))
                .isInstanceOf(ItineraryNotFoundException.class);
    }

    /**
     * The masking rule (Artifact 03): "no such itinerary" and "not yours" are one answer, so a probe
     * cannot learn an id is real from the shape of its rejection. The row-backed resolver keeps that
     * property for the same reason the owner-based one did — it cannot tell the two apart either.
     */
    @Test
    void aNonexistentItineraryRejectsIdenticallyToSomeoneElses() {
        UUID ana = UUID.randomUUID();
        UUID ben = UUID.randomUUID();
        Itinerary anasTrip = itineraries.create(ana, "Sapporo", List.of("Sapporo"), null, null);

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

    /**
     * An itinerary with no workspace — the state V5's backfill exists to eliminate — resolves to no
     * standing, for its own owner. Not a nice behaviour, and deliberately not softened: this is the
     * shape a failed backfill would take, and the story's answer is to prove the backfill on the
     * deployed rung (AC 6), not to add a fallback that would hide it (spec §The resolver swap).
     */
    @Test
    void anItineraryWithNoWorkspaceIsInvisibleEvenToItsOwner() {
        UUID ana = UUID.randomUUID();
        UUID orphanedTrip = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO itinerary (id, owner_id, title, destinations, state, visibility, created_at) "
                        + "VALUES (?, ?, 'Pre-E1 leftover', ?, 'DRAFT', 'PRIVATE', ?)",
                orphanedTrip,
                ana,
                new String[] {"nowhere"},
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
