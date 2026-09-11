package com.largata.join.exception;

import com.largata.common.error.ConflictException;
import com.largata.common.error.ForbiddenException;
import com.largata.common.error.NotFoundException;


public final class JoinExceptions {

    private JoinExceptions() {}


    public static final class UnknownJoinTokenException extends NotFoundException {
        public UnknownJoinTokenException() {
            super("JOIN_LINK_NOT_FOUND", "This invite link is not valid.");
        }
    }


    public static final class LinkClosedException extends ConflictException {
        public LinkClosedException() {
            super("JOIN_LINK_CLOSED", "This trip isn't taking new travelers.");
        }
    }


    public static final class AlreadyMemberException extends ConflictException {
        public AlreadyMemberException() {
            super("ALREADY_A_MEMBER", "You are already a member of this trip.");
        }
    }


    public static final class EmailNotVerifiedException extends ForbiddenException {
        public EmailNotVerifiedException() {
            super("EMAIL_NOT_VERIFIED", "Verify your email address to ask to join this trip.");
        }
    }


    public static final class NotTripOwnerException extends ForbiddenException {
        private NotTripOwnerException(String message) {
            super("NOT_PERMITTED", message);
        }

        public static NotTripOwnerException toReadTheQueue() {
            return new NotTripOwnerException("Only the trip owner can see who has asked to join.");
        }

        public static NotTripOwnerException toAnswerARequest() {
            return new NotTripOwnerException("Only the trip owner can approve or decline a request to join.");
        }
    }


    public static final class JoinRequestNotFoundException extends NotFoundException {
        public JoinRequestNotFoundException() {
            super("JOIN_REQUEST_NOT_FOUND", "No such request to join.");
        }
    }


    public static final class JoinRequestNotPendingException extends ConflictException {
        public JoinRequestNotPendingException() {
            super("ILLEGAL_STATE_TRANSITION", "This request has already been answered.");
        }
    }
}
