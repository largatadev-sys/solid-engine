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

        String status =
                jdbc.queryForObject("SELECT status FROM invitation WHERE id = ?", String.class, invitation.id());
        assertThat(status).as("the status flip rolled back with the failed membership write").isEqualTo("PENDING");
    }
}
