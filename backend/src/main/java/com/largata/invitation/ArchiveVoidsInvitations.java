package com.largata.invitation;

import com.largata.trip.api.TripArchived;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;


@Component
class ArchiveVoidsInvitations {

    private static final Logger log = LoggerFactory.getLogger(ArchiveVoidsInvitations.class);

    private final InvitationService invitations;

    ArchiveVoidsInvitations(InvitationService invitations) {
        this.invitations = invitations;
    }


    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    void onTripArchived(TripArchived archived) {
        try {
            invitations.voidPendingInvitations(archived.workspaceId());
        } catch (RuntimeException e) {
            log.warn(
                    "Pending invitations not voided after archive: tripId={} workspaceId={}",
                    archived.tripId(),
                    archived.workspaceId(),
                    e);
        }
    }
}
