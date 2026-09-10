package com.largata.invitation.adapter;

import com.largata.invitation.service.InvitationService;
import com.largata.trip.api.TripArchived;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
class ArchiveVoidsInvitations {

    private final InvitationService invitations;

    ArchiveVoidsInvitations(InvitationService invitations) {
        this.invitations = invitations;
    }


    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT, fallbackExecution = true)
    void onTripArchived(TripArchived archived) {
        invitations.voidPendingInvitations(archived.workspaceId());
    }
}
