package com.largata.invitation;

import com.largata.common.error.ConflictException;
import com.largata.common.error.ForbiddenException;
import com.largata.common.error.NotFoundException;

/**
 * The invitation module's rejections (S1.2), each a subtype of the taxonomy's category parents (06b
 * §3) so the global handler maps them to status codes and no controller ever picks one. Grouped in
 * one file because each is a two-line class whose only content is a stable {@code code} — the mobile
 * client branches on those codes (Artifact 05).
 */
final class InvitationExceptions {

    private InvitationExceptions() {}

    /**
     * A member who is not the owner tried an owner-only act (invite, revoke) — 403. Distinct from the
     * guard's 404: the caller <em>is</em> a member (the itinerary is not hidden from them), they just
     * lack the role. Same shape as the general {@code FORBIDDEN}, its own code for a clearer client.
     */
    static final class NotWorkspaceOwnerException extends ForbiddenException {
        NotWorkspaceOwnerException() {
            super("NOT_PERMITTED", "Only the trip owner can do that.");
        }
    }

    /** The invited address already belongs to a member — 409. */
    static final class AlreadyMemberException extends ConflictException {
        AlreadyMemberException() {
            super("ALREADY_A_MEMBER", "That person is already a member of this trip.");
        }
    }

    /** A live invitation to this address already exists — 409 (the one-pending rule, surfaced). */
    static final class InvitationAlreadyPendingException extends ConflictException {
        InvitationAlreadyPendingException() {
            super("INVITATION_ALREADY_PENDING", "That address already has a pending invitation.");
        }
    }

    /**
     * No such invitation for this caller — 404, and deliberately the answer for BOTH "no such
     * invitation" and "addressed to a different email than yours" (grilling Q5's mask): a verified
     * traveler must not learn that an invitation to some other address exists from the shape of the
     * rejection. Same masking discipline as the guard's {@code ITINERARY_NOT_FOUND}.
     */
    static final class InvitationNotFoundException extends NotFoundException {
        InvitationNotFoundException() {
            super("INVITATION_NOT_FOUND", "No such invitation.");
        }
    }

    /**
     * The accepting account's email is not verified — 403, its OWN code so the mobile client routes to
     * the verify-email waiting state (ticket 08) rather than showing a generic error. Reached only
     * when the email already matches (an unverified mismatch is a 404 first): the rightful but
     * unverified recipient is told to verify; a stranger is told nothing.
     */
    static final class EmailNotVerifiedException extends ForbiddenException {
        EmailNotVerifiedException() {
            super("EMAIL_NOT_VERIFIED", "Verify your email address to accept this invitation.");
        }
    }

    /** Accept/decline/revoke on a non-pending invitation — 409 (Artifact 05's {@code ILLEGAL_TRANSITION}). */
    static final class InvitationNotPendingException extends ConflictException {
        InvitationNotPendingException() {
            super("ILLEGAL_TRANSITION", "This invitation is no longer open.");
        }
    }

    /** Accept/decline of an invitation past its 14-day window — 409. */
    static final class InvitationExpiredException extends ConflictException {
        InvitationExpiredException() {
            super("INVITATION_EXPIRED", "This invitation has expired. Ask the owner to invite you again.");
        }
    }
}
