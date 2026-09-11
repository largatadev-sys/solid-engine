package com.largata.invitation.exception;

import com.largata.common.error.ConflictException;
import com.largata.common.error.ForbiddenException;
import com.largata.common.error.NotFoundException;


public final class InvitationExceptions {

    private InvitationExceptions() {}


    public static final class NotWorkspaceOwnerException extends ForbiddenException {
        NotWorkspaceOwnerException() {
            super("NOT_PERMITTED", "Only the trip owner can do that.");
        }
    }


    public static final class AlreadyMemberException extends ConflictException {
        public AlreadyMemberException() {
            this("That person is already a member of this trip.");
        }


        public AlreadyMemberException(String message) {
            super("ALREADY_A_MEMBER", message);
        }
    }


    public static final class InvitationAlreadyPendingException extends ConflictException {
        public InvitationAlreadyPendingException() {
            super("INVITATION_ALREADY_PENDING", "That address already has a pending invitation.");
        }
    }


    public static final class InvitationNotFoundException extends NotFoundException {
        public InvitationNotFoundException() {
            super("INVITATION_NOT_FOUND", "No such invitation.");
        }
    }


    public static final class EmailNotVerifiedException extends ForbiddenException {
        public EmailNotVerifiedException() {
            super("EMAIL_NOT_VERIFIED", "Verify your email address to accept this invitation.");
        }
    }


    public static final class InvitationNotPendingException extends ConflictException {
        public InvitationNotPendingException() {
            super("ILLEGAL_TRANSITION", "This invitation is no longer open.");
        }
    }


    public static final class InvitationExpiredException extends ConflictException {
        public InvitationExpiredException() {
            super("INVITATION_EXPIRED", "This invitation has expired. Ask the owner to invite you again.");
        }
    }
}
