package com.largata.membership;

import com.largata.common.error.ConflictException;
import com.largata.common.error.ForbiddenException;
import com.largata.common.error.NotFoundException;


final class MembershipExceptions {

    private MembershipExceptions() {}


    static final class NotTripOwnerException extends ForbiddenException {
        private NotTripOwnerException(String message) {
            super("NOT_PERMITTED", message);
        }

        static NotTripOwnerException toRemoveAMember() {
            return new NotTripOwnerException("Only the trip owner can remove a member.");
        }

        static NotTripOwnerException toChangeArchiveState() {
            return new NotTripOwnerException("Only the trip owner can archive or unarchive this trip.");
        }

        static NotTripOwnerException toOfferOwnership() {
            return new NotTripOwnerException("Only the trip owner can offer ownership of this trip.");
        }

        static NotTripOwnerException toRevokeAnOffer() {
            return new NotTripOwnerException("Only the trip owner can revoke an ownership offer.");
        }
    }


    static final class OwnerCannotLeaveException extends ConflictException {
        OwnerCannotLeaveException() {
            super("OWNER_CANNOT_LEAVE", "Offer ownership to another member and have them accept before leaving this trip.");
        }
    }


    static final class TargetNotAMemberException extends ConflictException {
        TargetNotAMemberException() {
            super("TARGET_NOT_A_MEMBER", "Only a member of this trip can be offered ownership. Invite them first.");
        }
    }


    static final class CannotOfferToSelfException extends ConflictException {
        CannotOfferToSelfException() {
            super("CANNOT_OFFER_TO_SELF", "You already own this trip.");
        }
    }


    static final class OfferAlreadyPendingException extends ConflictException {
        OfferAlreadyPendingException() {
            super("OFFER_ALREADY_PENDING", "An ownership offer is already pending on this trip. Revoke it first.");
        }
    }


    static final class NoPendingOfferException extends NotFoundException {
        NoPendingOfferException() {
            super("OFFER_NOT_FOUND", "There is no pending ownership offer on this trip.");
        }
    }


    static final class NotOfferTargetException extends ForbiddenException {
        NotOfferTargetException() {
            super("NOT_OFFER_TARGET", "This ownership offer was made to another member.");
        }
    }


    static final class IllegalWorkspaceTransitionException extends ConflictException {
        IllegalWorkspaceTransitionException(String message) {
            super("ILLEGAL_STATE_TRANSITION", message);
        }

        static IllegalWorkspaceTransitionException alreadyArchived() {
            return new IllegalWorkspaceTransitionException("This trip is already archived.");
        }

        static IllegalWorkspaceTransitionException notArchived() {
            return new IllegalWorkspaceTransitionException("This trip is not archived.");
        }
    }
}
