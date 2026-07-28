package com.largata.membership;

import com.largata.common.error.ConflictException;
import com.largata.common.error.ForbiddenException;
import com.largata.common.error.NotFoundException;

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
            super("OWNER_CANNOT_LEAVE", "Offer ownership to another member and have them accept before leaving this trip.");
        }
    }

    /**
     * The owner offered ownership to someone who is not on the trip — 409, naming the remedy (invite
     * them first).
     *
     * <p><strong>Not a 404, and the distinction is Artifact 03's.</strong> A 404 here would be masking,
     * and there is nothing to mask: the caller is the owner, they can read the roster, and they already
     * know who is and is not on it. Masking exists to stop a probe learning that an id is real; refusing
     * a coherent request against a target the caller can already enumerate is a conflict, not a secret.
     */
    static final class TargetNotAMemberException extends ConflictException {
        TargetNotAMemberException() {
            super("TARGET_NOT_A_MEMBER", "Only a member of this trip can be offered ownership. Invite them first.");
        }
    }

    /**
     * The owner offered ownership to themselves — 409.
     *
     * <p>A no-op 204 was considered and rejected: this is a <em>create</em> endpoint, and answering 201
     * or 204 to "make me owner, I am the owner" would mean the client cannot tell a real offer from a
     * swallowed mistake. Idempotency belongs on DELETE (Artifact 05), where the asked-for end state is
     * genuinely already true; here the asked-for thing — a pending offer — would not exist.
     */
    static final class CannotOfferToSelfException extends ConflictException {
        CannotOfferToSelfException() {
            super("CANNOT_OFFER_TO_SELF", "You already own this trip.");
        }
    }

    /**
     * An offer is already outstanding on this trip — 409, naming the remedy (revoke it first).
     *
     * <p>Silently superseding the old offer was rejected at the grilling: one crown, one outstretched
     * hand, and the owner should <em>know</em> they are retracting from one person before extending to
     * another. V9's partial unique index enforces the same rule one layer down, so this exception is
     * the readable answer rather than the only defence — a race that slips past this check dies on the
     * constraint rather than producing two live offers.
     */
    static final class OfferAlreadyPendingException extends ConflictException {
        OfferAlreadyPendingException() {
            super("OFFER_ALREADY_PENDING", "An ownership offer is already pending on this trip. Revoke it first.");
        }
    }

    /**
     * Accept or decline addressed to an offer that does not exist — 404.
     *
     * <p>The singleton's "not found": the caller is a member (the guard let them through) but this trip
     * has no live offer at all. Distinct from {@link NotTripOwnerException}'s sibling below — an offer
     * that exists but belongs to somebody else is a 403, because refusing it must not depend on whether
     * the caller happens to be its target.
     */
    static final class NoPendingOfferException extends NotFoundException {
        NoPendingOfferException() {
            super("OFFER_NOT_FOUND", "There is no pending ownership offer on this trip.");
        }
    }

    /**
     * A member tried to accept or decline an offer made to somebody else — 403.
     *
     * <p><strong>This is what makes the stale-accept race safe by construction</strong> (S1.6 §7). If B's
     * offer is revoked and C is then offered the crown, B's late accept — a retry, a stale screen, a
     * queued request — finds a pending offer that is not theirs and is refused. B can never take C's
     * crown, and the outcome does not depend on timing or on the client having refreshed.
     *
     * <p><strong>Its own code, not the shared {@code NOT_PERMITTED}</strong>, and the reason is the copy
     * on the other end. {@code NOT_PERMITTED} means "you are a member but this is the owner's to do" —
     * every client string for it says something about owners. This situation is the opposite shape: the
     * caller is not lacking a <em>role</em>, they are acting on somebody else's offer, and the honest
     * sentence ("that offer is no longer yours") is one the owner-flavoured code cannot carry. Since the
     * client branches on the code and never the message (Artifact 05), one code cannot serve two
     * meanings without one of them reading wrong. Adding a code is additive (ADR-008); old clients fall
     * through to the message, which is already the right sentence.
     */
    static final class NotOfferTargetException extends ForbiddenException {
        NotOfferTargetException() {
            super("NOT_OFFER_TARGET", "This ownership offer was made to another member.");
        }
    }
}
