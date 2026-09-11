package com.largata.join.exception;

import com.largata.common.error.ForbiddenException;


public class SignInRequiredException extends ForbiddenException {

    public SignInRequiredException() {
        super("SIGN_IN_REQUIRED", "Sign in to ask to join this trip.");
    }
}
