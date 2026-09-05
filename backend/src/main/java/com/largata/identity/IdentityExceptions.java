package com.largata.identity;

import com.largata.common.error.ConflictException;
import com.largata.common.error.ForbiddenException;
import com.largata.common.error.NotFoundException;
import com.largata.common.error.UnavailableException;
import com.largata.common.error.ValidationException;


public final class IdentityExceptions {

    private IdentityExceptions() {}


    public static final class NoSuchHandleException extends NotFoundException {
        public NoSuchHandleException() {
            super("TRAVELER_NOT_FOUND", "No traveler goes by that handle.");
        }
    }


    public static final class MalformedHandleException extends ValidationException {
        MalformedHandleException() {
            super(
                    "HANDLE_MALFORMED",
                    "Handles are "
                            + Handle.MIN_LENGTH
                            + " to "
                            + Handle.MAX_LENGTH
                            + " characters, using letters, numbers and underscores only.");
        }
    }


    public static final class HandleReservedException extends ValidationException {
        HandleReservedException() {
            super("HANDLE_RESERVED", "That handle is reserved. Please choose another.");
        }
    }


    public static final class HandleTakenException extends ConflictException {
        HandleTakenException() {
            super("HANDLE_TAKEN", "That handle is already taken. Please choose another.");
        }
    }


    public static final class VanityPoolUnavailableException extends UnavailableException {
        VanityPoolUnavailableException() {
            super("VANITY_POOL_UNAVAILABLE", "We could not finish setting up your account. Please try again.");
        }
    }


    public static final class SelfFollowException extends ValidationException {
        SelfFollowException() {
            super("FOLLOW_SELF", "You cannot follow yourself.");
        }
    }


    public static final class UnknownProfileVisibilityException extends ValidationException {
        UnknownProfileVisibilityException(String given) {
            super(
                    "PROFILE_VISIBILITY_UNKNOWN",
                    "A profile is either public or private, not \"" + given + "\".");
        }
    }


    public static final class ProfilePrivateException extends ForbiddenException {
        public ProfilePrivateException() {
            super("PROFILE_PRIVATE", "This profile is private. Follow to see what they share.");
        }
    }


    public static final class NoSuchFollowRequestException extends NotFoundException {
        public NoSuchFollowRequestException() {
            super("FOLLOW_REQUEST_NOT_FOUND", "There is no pending follow request from that traveler.");
        }
    }
}
