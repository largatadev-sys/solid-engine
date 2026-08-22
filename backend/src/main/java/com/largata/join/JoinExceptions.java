package com.largata.join;

import com.largata.common.error.ConflictException;
import com.largata.common.error.ForbiddenException;
import com.largata.common.error.NotFoundException;


final class JoinExceptions {

    private JoinExceptions() {}


    static final class UnknownJoinTokenException extends NotFoundException {
        UnknownJoinTokenException() {
            super("JOIN_LINK_NOT_FOUND", "This invite link is not valid.");
        }
    }


    static final class LinkClosedException extends ConflictException {
        LinkClosedException() {
            super("JOIN_LINK_CLOSED", "This trip isn't taking new travelers.");
        }
    }


    static final class AlreadyMemberException extends ConflictException {
        AlreadyMemberException() {
            super("ALREADY_A_MEMBER", "You are already a member of this trip.");
        }
    }


    static final class EmailNotVerifiedException extends ForbiddenException {
        EmailNotVerifiedException() {
            super("EMAIL_NOT_VERIFIED", "Verify your email address to ask to join this trip.");
        }
    }


    static final class NotTripOwnerException extends ForbiddenException {
        private NotTripOwnerException(String message) {
            super("NOT_PERMITTED", message);
        }

        static NotTripOwnerException toReadTheQueue() {
            return new NotTripOwnerException("Only the trip owner can see who has asked to join.");
        }

        static NotTripOwnerException toAnswerARequest() {
            return new NotTripOwnerException("Only the trip owner can approve or decline a request to join.");
        }
    }


    static final class JoinRequestNotFoundException extends NotFoundException {
        JoinRequestNotFoundException() {
            super("JOIN_REQUEST_NOT_FOUND", "No such request to join.");
        }
    }


    static final class JoinRequestNotPendingException extends ConflictException {
        JoinRequestNotPendingException() {
            super("ILLEGAL_STATE_TRANSITION", "This request has already been answered.");
        }
    }
}
