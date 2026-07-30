package com.largata.identity;

import com.largata.common.error.ConflictException;
import com.largata.common.error.ValidationException;


public final class IdentityExceptions {

    private IdentityExceptions() {}


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
}
