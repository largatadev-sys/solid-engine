package com.largata.invitation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.itinerary.Itinerary;
import com.largata.itinerary.ItineraryService;
import com.largata.support.PostgresTestBase;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;


@SpringBootTest
class InvitationStorageIT extends PostgresTestBase {

    @Autowired private ItineraryService itineraries;
    @Autowired private InvitationRepository invitations;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void theStatusColumnHoldsTheEnumsName() {
        UUID workspaceId = aWorkspace();

        invitations.saveAndFlush(Invitation.open(workspaceId, "ana@example.com", UUID.randomUUID(), Instant.now()));

        String stored =
                jdbc.queryForObject(
                        "SELECT status FROM invitation WHERE workspace_id = ?", String.class, workspaceId);
        assertThat(stored)
                .as("invitation_one_pending_idx tests status = 'PENDING'; this is that value")
                .isEqualTo(InvitationStatus.PENDING.name())
                .isEqualTo("PENDING");
    }

    @Test
    void aSecondPendingInvitationForTheSameAddressIsRefused() {
        UUID workspaceId = aWorkspace();
        invitations.saveAndFlush(Invitation.open(workspaceId, "dup@example.com", UUID.randomUUID(), Instant.now()));

        assertThatThrownBy(
                        () ->
                                invitations.saveAndFlush(
                                        Invitation.open(
                                                workspaceId, "dup@example.com", UUID.randomUUID(), Instant.now())))
                .as("invitation_one_pending_idx refuses two live invitations to one inbox")
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aSecondPendingInvitationForTheSameTravelerIsRefused() {
        UUID workspaceId = aWorkspace();
        UUID invitee = UUID.randomUUID();
        invitations.saveAndFlush(Invitation.openFor(workspaceId, invitee, UUID.randomUUID(), Instant.now()));

        assertThatThrownBy(
                        () ->
                                invitations.saveAndFlush(
                                        Invitation.openFor(
                                                workspaceId, invitee, UUID.randomUUID(), Instant.now())))
                .as("V6's email index cannot cover this: NULLs never collide, so V17 adds its own")
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void anInvitationIsAddressedOneWayOrTheOtherButNeverBoth() {
        UUID workspaceId = aWorkspace();

        assertThatThrownBy(
                        () ->
                                jdbc.update(
                                        "INSERT INTO invitation"
                                            + " (id, workspace_id, email, invitee_traveler_id, status, invited_by,"
                                            + " created_at, expires_at)"
                                            + " VALUES (?, ?, 'both@example.com', ?, 'PENDING', ?, ?, ?)",
                                        UUID.randomUUID(),
                                        workspaceId,
                                        UUID.randomUUID(),
                                        UUID.randomUUID(),
                                        java.sql.Timestamp.from(Instant.now()),
                                        java.sql.Timestamp.from(Instant.now().plusSeconds(60))))
                .as("invitation_one_addressing_mode: matchable two ways would be revocable once")
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void twoDifferentAddressesCanBothBePendingInOneWorkspace() {
        UUID workspaceId = aWorkspace();
        invitations.saveAndFlush(Invitation.open(workspaceId, "a@example.com", UUID.randomUUID(), Instant.now()));
        invitations.saveAndFlush(Invitation.open(workspaceId, "b@example.com", UUID.randomUUID(), Instant.now()));

        Integer pending =
                jdbc.queryForObject(
                        "SELECT count(*) FROM invitation WHERE workspace_id = ? AND status = 'PENDING'",
                        Integer.class,
                        workspaceId);
        assertThat(pending).isEqualTo(2);
    }

    @Test
    void theSameAddressCanBePendingInTwoDifferentWorkspaces() {
        UUID first = aWorkspace();
        UUID second = aWorkspace();
        invitations.saveAndFlush(Invitation.open(first, "same@example.com", UUID.randomUUID(), Instant.now()));

        invitations.saveAndFlush(Invitation.open(second, "same@example.com", UUID.randomUUID(), Instant.now()));

        assertThat(pendingCount(first)).isEqualTo(1);
        assertThat(pendingCount(second)).isEqualTo(1);
    }

    private Integer pendingCount(UUID workspaceId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM invitation WHERE workspace_id = ? AND status = 'PENDING'",
                Integer.class,
                workspaceId);
    }

    @Test
    void aMixedCaseEmailIsRejectedBeforeItCanReachStorage() {
        assertThatThrownBy(
                        () -> Invitation.open(aWorkspace(), "Ana@Example.com", UUID.randomUUID(), Instant.now()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private UUID aWorkspace() {
        Itinerary itinerary = itineraries.create(UUID.randomUUID(), "Lisbon", List.of("Lisbon"), null, null);
        return jdbc.queryForObject("SELECT id FROM workspace WHERE itinerary_id = ?", UUID.class, itinerary.id());
    }
}
