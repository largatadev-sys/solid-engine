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

/**
 * Ticket 01's storage contract: the enum spelling {@code invitation_one_pending_idx} silently depends
 * on, and the index itself firing.
 *
 * <p>Same shape and same reason as {@code MembershipStorageIT}. The partial unique index has the
 * predicate {@code WHERE status = 'PENDING'}; if the column's spelling ever moved — an {@code
 * AttributeConverter}, a lower-casing "tidy" — the predicate would match nothing, the index would
 * create successfully and cost nothing, and two live invitations to one inbox would be possible with
 * no error and no other failing test. This class is the guard against that class of silent failure.
 */
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

        // The index keys on (workspace_id, email), so the same address in another workspace is fine.
        invitations.saveAndFlush(Invitation.open(second, "same@example.com", UUID.randomUUID(), Instant.now()));

        // Scoped to these two workspaces — the container is shared across the run (PostgresTestBase),
        // so a global count(*) would also see other tests' rows.
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
        // Normalisation is the caller's job (Invitation.open enforces it), so the CHECK constraint is
        // never actually reached in practice — but both exist, and this proves the domain guard fires.
        assertThatThrownBy(
                        () -> Invitation.open(aWorkspace(), "Ana@Example.com", UUID.randomUUID(), Instant.now()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private UUID aWorkspace() {
        Itinerary itinerary = itineraries.create(UUID.randomUUID(), "Lisbon", List.of("Lisbon"), null, null);
        return jdbc.queryForObject("SELECT id FROM workspace WHERE itinerary_id = ?", UUID.class, itinerary.id());
    }
}
