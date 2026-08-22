package com.largata.join.web;

import com.largata.common.error.ForbiddenException;


class SignInRequiredException extends ForbiddenException {

    SignInRequiredException() {
        super("SIGN_IN_REQUIRED", "Sign in to ask to join this trip.");
    }
}
