package com.largata.verification;

import com.largata.common.error.ConflictException;
import com.largata.common.error.ValidationException;


final class VerificationExceptions {

    private VerificationExceptions() {}


    static final class AlreadyVerifiedException extends ConflictException {
        AlreadyVerifiedException() {
            super("EMAIL_ALREADY_VERIFIED", "This email address is already verified.");
        }
    }


    static final class NoAddressOnTokenException extends ConflictException {
        NoAddressOnTokenException() {
            super("NO_EMAIL_ON_ACCOUNT", "This account has no email address to verify.");
        }
    }


    static final class ResendCooldownException extends ConflictException {
        ResendCooldownException() {
            super("VERIFICATION_RESEND_TOO_SOON", "A code was just sent. Wait a moment before asking for another.");
        }
    }


    static final class CodeNotIssuedException extends ConflictException {
        CodeNotIssuedException() {
            super("VERIFICATION_CODE_NOT_ISSUED", "No code is waiting. Ask for a new one.");
        }
    }


    static final class CodeExpiredException extends ConflictException {
        CodeExpiredException() {
            super("VERIFICATION_CODE_EXPIRED", "That code has expired. Ask for a new one.");
        }
    }


    static final class AttemptsExhaustedException extends ConflictException {
        AttemptsExhaustedException() {
            super("VERIFICATION_ATTEMPTS_EXHAUSTED", "Too many wrong codes. Ask for a new one.");
        }
    }


    static final class CodeIncorrectException extends ValidationException {
        CodeIncorrectException() {
            super("VERIFICATION_CODE_INCORRECT", "That code is not right. Check it and try again.");
        }
    }
}
