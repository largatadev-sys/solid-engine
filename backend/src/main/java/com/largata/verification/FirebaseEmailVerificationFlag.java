package com.largata.verification;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import com.largata.common.error.DependencyUnavailableException;


final class FirebaseEmailVerificationFlag implements EmailVerificationFlag {

    private final FirebaseAuth auth;

    FirebaseEmailVerificationFlag(FirebaseAuth auth) {
        this.auth = auth;
    }

    @Override
    public void markVerified(String firebaseUid) {
        try {
            auth.updateUser(new UserRecord.UpdateRequest(firebaseUid).setEmailVerified(true));
        } catch (FirebaseAuthException providerRefusedOrUnreachable) {
            throw new DependencyUnavailableException(
                    "Could not confirm your email right now. Try again shortly.", providerRefusedOrUnreachable);
        }
    }
}
