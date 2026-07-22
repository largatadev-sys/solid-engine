package com.largata.invitation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.identity.Traveler;
import com.largata.identity.TravelerClaims;
import com.largata.identity.TravelerService;
import com.largata.identity.web.VerifiedContact;
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
 * AC 3's failure direction: the accept is one transaction — if the membership write fails, the
 * invitation's status flip rolls back with it, so a membership never exists without its invitation
 * accepted, nor the reverse (S1.2 spec §ACs).
 *
 * <p><strong>The failure is injected without a mock</strong>, and deliberately so: the S1.1 spec
 * records that a Spring spy wraps the {@code @Transactional} proxy, so stubbing a {@code MANDATORY}
 * method (which {@code admitMember} is) runs the interceptor during stub setup and throws before the
 * test body. Instead we seed the accepting traveler as already a member, so {@code admitMember} hits
 * the {@code (workspace_id, traveler_id)} primary key at commit — a real database failure injected
 * exactly where a real one would happen. Only the failure case proves atomicity (the happy path
 * cannot distinguish one transaction from two lucky ones — the same reasoning as S1.1's rollback IT).
 */
@SpringBootTest
class InvitationAcceptTransactionIT extends PostgresTestBase {

    @Autowired private InvitationService invitationService;
    @Autowired private ItineraryService itineraries;
    @Autowired private TravelerService travelers;
    @Autowired private InvitationRepository invitations;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void aFailedMembershipWriteRollsBackTheInvitationStatus() {
        UUID owner = UUID.randomUUID();
        Itinerary itinerary = itineraries.create(owner, "Lisbon", List.of("Lisbon"), null, null);
        UUID workspaceId =
                jdbc.queryForObject("SELECT id FROM workspace WHERE itinerary_id = ?", UUID.class, itinerary.id());

        Traveler guest = travelers.getOrProvision(TravelerClaims.of("uid-guest", "guest@example.com", "Guest"));
        Invitation invitation =
                invitations.saveAndFlush(Invitation.open(workspaceId, "guest@example.com", owner, Instant.now()));

        // Sabotage: the guest is already a member, so admitMember's insert will violate the PK. This
        // state is unreachable through the API (invite blocks already-members) — it is manufactured to
        // force the membership write to fail during accept.
        jdbc.update(
                "INSERT INTO membership (workspace_id, traveler_id, role, joined_at) VALUES (?, ?, 'MEMBER', ?)",
                workspaceId,
                guest.id(),
                Timestamp.from(Instant.now()));

        assertThatThrownBy(
                        () ->
                                invitationService.accept(
                                        invitation.id(), new VerifiedContact("guest@example.com", true), guest.id()))
                .as("the membership PK violation aborts the accept")
                .isInstanceOf(RuntimeException.class);

        // The invariant: the invitation did NOT flip to ACCEPTED — the status update rolled back with
        // the failed membership insert. A two-transaction implementation would have left it ACCEPTED.
        String status =
                jdbc.queryForObject("SELECT status FROM invitation WHERE id = ?", String.class, invitation.id());
        assertThat(status).as("the status flip rolled back with the failed membership write").isEqualTo("PENDING");
    }
}
