package com.largata.verification.exception;

import com.largata.common.error.ConflictException;
import com.largata.common.error.ValidationException;


public final class VerificationExceptions {

    private VerificationExceptions() {}


    public static final class AlreadyVerifiedException extends ConflictException {
        public AlreadyVerifiedException() {
            super("EMAIL_ALREADY_VERIFIED", "This email address is already verified.");
        }
    }


    public static final class NoAddressOnTokenException extends ConflictException {
        public NoAddressOnTokenException() {
            super("NO_EMAIL_ON_ACCOUNT", "This account has no email address to verify.");
        }
    }


    public static final class ResendCooldownException extends ConflictException {
        public ResendCooldownException() {
            super("VERIFICATION_RESEND_TOO_SOON", "A code was just sent. Wait a moment before asking for another.");
        }
    }


    public static final class CodeNotIssuedException extends ConflictException {
        public CodeNotIssuedException() {
            super("VERIFICATION_CODE_NOT_ISSUED", "No code is waiting. Ask for a new one.");
        }
    }


    public static final class CodeExpiredException extends ConflictException {
        public CodeExpiredException() {
            super("VERIFICATION_CODE_EXPIRED", "That code has expired. Ask for a new one.");
        }
    }


    public static final class AttemptsExhaustedException extends ConflictException {
        public AttemptsExhaustedException() {
            super("VERIFICATION_ATTEMPTS_EXHAUSTED", "Too many wrong codes. Ask for a new one.");
        }
    }


    public static final class CodeIncorrectException extends ValidationException {
        public CodeIncorrectException() {
            super("VERIFICATION_CODE_INCORRECT", "That code is not right. Check it and try again.");
        }
    }
}
