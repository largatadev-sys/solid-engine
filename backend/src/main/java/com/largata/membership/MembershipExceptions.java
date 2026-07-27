package com.largata.membership;

import com.largata.common.error.ConflictException;
import com.largata.common.error.ForbiddenException;

/**
 * The membership module's rejections (S1.5), each a subtype of the taxonomy's category parents (06b
 * §3) so the global handler picks the status and no controller ever does. Grouped in one file for the
 * reason {@code InvitationExceptions} records: each is a two-line class whose only real content is a
 * stable {@code code} the mobile client branches on (Artifact 05).
 */
final class MembershipExceptions {

    private MembershipExceptions() {}

    /**
     * A member who is not the owner tried to remove somebody else — 403.
     *
     * <p>Carries {@code NOT_PERMITTED}, the same code the invitation module's owner-only rejections
     * use, deliberately: from the client's side "you are a member but this is the owner's to do" is one
     * situation, and a second code for it would mean two branches for one meaning. The duplicated
     * string across two modules is the price of each module owning its own rejections rather than a
     * shared exception grab-bag — and the codes are Artifact 05's vocabulary, not either module's.
     *
     * <p>Distinct from the guard's 404: this caller <em>is</em> on the trip, so nothing is being masked
     * from them; they simply lack the role.
     */
    static final class NotTripOwnerException extends ForbiddenException {
        NotTripOwnerException() {
            super("NOT_PERMITTED", "Only the trip owner can remove a member.");
        }
    }

    /**
     * The owner tried to leave (or be removed) — 409, its own code because the client's answer is a
     * specific one: transfer ownership first.
     *
     * <p>This is INV-4 refusing to be broken. A workspace has exactly one owner at all times, so an
     * owner's departure is only coherent as a two-step act — transfer, then leave — and the transfer
     * half is S1.6. Until then the honest answer is a conflict naming the missing step, not a silent
     * refusal and not an ownerless trip.
     */
    static final class OwnerCannotLeaveException extends ConflictException {
        OwnerCannotLeaveException() {
            super("OWNER_CANNOT_LEAVE", "Transfer ownership to another member before leaving this trip.");
        }
    }
}
