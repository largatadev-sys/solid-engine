package com.largata.verification.service;


public interface EmailVerificationFlag {

    void markVerified(String firebaseUid);
}
