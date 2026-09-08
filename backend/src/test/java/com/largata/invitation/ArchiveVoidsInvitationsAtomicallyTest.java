package com.largata.invitation;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.trip.api.TripArchived;
import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;


class ArchiveVoidsInvitationsAtomicallyTest {

    @Test
    void theListenerRunsInsideTheArchivesTransactionAndNotAfterIt() throws Exception {
        Method reaction =
                ArchiveVoidsInvitations.class.getDeclaredMethod("onTripArchived", TripArchived.class);
        TransactionalEventListener listener = reaction.getAnnotation(TransactionalEventListener.class);

        assertThat(listener).as("the reaction is transactional or it is not ordered at all").isNotNull();
        assertThat(listener.phase())
                .as(
                        "TW-1 broke the archive->invitation cycle by publishing an event, and the"
                                + " event must not also break the ACT. AFTER_COMMIT would let the"
                                + " archive commit and the voiding then fail, leaving an archived"
                                + " trip still holding PENDING invitations - the exact state user"
                                + " story 4 exists to prevent, and the state the spec refused for"
                                + " admission on the same reasoning. BEFORE_COMMIT keeps the two"
                                + " writes one act while the cycle stays broken")
                .isEqualTo(TransactionPhase.BEFORE_COMMIT);
    }


    @Test
    void theVoidingRefusesToRunWithoutATransactionToJoin() throws Exception {
        Method voiding = InvitationService.class.getDeclaredMethod("voidPendingInvitations", java.util.UUID.class);
        Transactional transactional = voiding.getAnnotation(Transactional.class);

        assertThat(transactional).isNotNull();
        assertThat(transactional.propagation())
                .as(
                        "MANDATORY is what makes the atomicity above impossible to lose quietly: if"
                                + " the phase were ever moved back to AFTER_COMMIT there is no"
                                + " transaction to join, so the reaction throws instead of half-"
                                + " succeeding. REQUIRES_NEW would silently restore the split")
                .isEqualTo(Propagation.MANDATORY);
    }
}
