package com.largata.invitation;

import com.largata.common.error.ConflictException;
import com.largata.common.error.ForbiddenException;
import com.largata.common.error.NotFoundException;


final class InvitationExceptions {

    private InvitationExceptions() {}


    static final class NotWorkspaceOwnerException extends ForbiddenException {
        NotWorkspaceOwnerException() {
            super("NOT_PERMITTED", "Only the trip owner can do that.");
        }
    }


    static final class AlreadyMemberException extends ConflictException {
        AlreadyMemberException() {
            super("ALREADY_A_MEMBER", "That person is already a member of this trip.");
        }
    }


    static final class InvitationAlreadyPendingException extends ConflictException {
        InvitationAlreadyPendingException() {
            super("INVITATION_ALREADY_PENDING", "That address already has a pending invitation.");
        }
    }


    static final class InvitationNotFoundException extends NotFoundException {
        InvitationNotFoundException() {
            super("INVITATION_NOT_FOUND", "No such invitation.");
        }
    }


    static final class EmailNotVerifiedException extends ForbiddenException {
        EmailNotVerifiedException() {
            super("EMAIL_NOT_VERIFIED", "Verify your email address to accept this invitation.");
        }
    }


    static final class InvitationNotPendingException extends ConflictException {
        InvitationNotPendingException() {
            super("ILLEGAL_TRANSITION", "This invitation is no longer open.");
        }
    }


    static final class InvitationExpiredException extends ConflictException {
        InvitationExpiredException() {
            super("INVITATION_EXPIRED", "This invitation has expired. Ask the owner to invite you again.");
        }
    }
}
