package com.largata.trip.ownership.exception;

import com.largata.common.error.ConflictException;
import com.largata.common.error.ForbiddenException;
import com.largata.common.error.NotFoundException;


public final class MembershipExceptions {

    private MembershipExceptions() {}


    public static final class NotTripOwnerException extends ForbiddenException {
        private NotTripOwnerException(String message) {
            super("NOT_PERMITTED", message);
        }

        public static NotTripOwnerException toRemoveAMember() {
            return new NotTripOwnerException("Only the trip owner can remove a member.");
        }

        public static NotTripOwnerException toChangeArchiveState() {
            return new NotTripOwnerException("Only the trip owner can archive or unarchive this trip.");
        }

        public static NotTripOwnerException toOfferOwnership() {
            return new NotTripOwnerException("Only the trip owner can offer ownership of this trip.");
        }

        public static NotTripOwnerException toRevokeAnOffer() {
            return new NotTripOwnerException("Only the trip owner can revoke an ownership offer.");
        }
    }


    public static final class OwnerCannotLeaveException extends ConflictException {
        public OwnerCannotLeaveException() {
            super("OWNER_CANNOT_LEAVE", "Offer ownership to another member and have them accept before leaving this trip.");
        }
    }


    public static final class TargetNotAMemberException extends ConflictException {
        public TargetNotAMemberException() {
            super("TARGET_NOT_A_MEMBER", "Only a member of this trip can be offered ownership. Invite them first.");
        }
    }


    public static final class CannotOfferToSelfException extends ConflictException {
        public CannotOfferToSelfException() {
            super("CANNOT_OFFER_TO_SELF", "You already own this trip.");
        }
    }


    public static final class OfferAlreadyPendingException extends ConflictException {
        public OfferAlreadyPendingException() {
            super("OFFER_ALREADY_PENDING", "An ownership offer is already pending on this trip. Revoke it first.");
        }
    }


    public static final class NoPendingOfferException extends NotFoundException {
        public NoPendingOfferException() {
            super("OFFER_NOT_FOUND", "There is no pending ownership offer on this trip.");
        }
    }


    public static final class NotOfferTargetException extends ForbiddenException {
        public NotOfferTargetException() {
            super("NOT_OFFER_TARGET", "This ownership offer was made to another member.");
        }
    }


    public static final class IllegalWorkspaceTransitionException extends ConflictException {
        IllegalWorkspaceTransitionException(String message) {
            super("ILLEGAL_STATE_TRANSITION", message);
        }

        public static IllegalWorkspaceTransitionException alreadyArchived() {
            return new IllegalWorkspaceTransitionException("This trip is already archived.");
        }

        public static IllegalWorkspaceTransitionException notArchived() {
            return new IllegalWorkspaceTransitionException("This trip is not archived.");
        }
    }
}
