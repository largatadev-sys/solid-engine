package com.largata.verification;

import com.largata.common.error.DependencyUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


final class UnconfiguredEmailVerificationFlag implements EmailVerificationFlag {

    private static final Logger log = LoggerFactory.getLogger(UnconfiguredEmailVerificationFlag.class);

    @Override
    public void markVerified(String firebaseUid) {
        log.error(
                "Email verification is unreachable on this rung: largata.firebase.credentials is unset, "
                        + "so no Admin SDK credential exists to flip the claim");
        throw new DependencyUnavailableException("Could not confirm your email right now. Try again shortly.");
    }
}
