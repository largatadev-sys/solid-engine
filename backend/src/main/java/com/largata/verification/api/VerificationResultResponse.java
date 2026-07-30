package com.largata.verification.api;


public record VerificationResultResponse(boolean verified) {

    public static VerificationResultResponse confirmed() {
        return new VerificationResultResponse(true);
    }
}
