package com.largata.common.tx;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Runs an action once the current transaction has committed — and inline if there is no transaction.
 *
 * <p><strong>Why this exists.</strong> Analytics emission and outbound mail must not act on a write a
 * later rollback erases (a funnel counting trips that do not exist; an email about an invitation that
 * did not commit), and both should stay off the request's critical path. The pattern is a
 * {@code registerSynchronization} with an {@code afterCommit} callback — small, but it was copied
 * verbatim into three services ({@code ItineraryService}, {@code InvitationService}, {@code
 * DayService}) before it was extracted here at S1.3's code review. Three identical copies of
 * transaction-lifecycle logic is exactly the DRY case P9 names; this is its one home.
 *
 * <p><strong>The no-transaction branch is not an edge case — it is the test path.</strong> A direct
 * service call in a unit/IT test often runs outside a transaction; there, deferring would mean the
 * action never fires and the assertion silently sees nothing. So with no active synchronization the
 * action runs immediately, which is the correct semantics (there is no commit to wait for) and keeps
 * the emitting services testable without a transaction template.
 */
public final class AfterCommit {

    private AfterCommit() {}

    /** Registers {@code action} to run after commit, or runs it now if no transaction is active. */
    public static void run(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        action.run();
                    }
                });
    }
}
