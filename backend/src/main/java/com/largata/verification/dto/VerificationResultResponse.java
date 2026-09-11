package com.largata.verification.dto;


public record VerificationResultResponse(boolean verified) {

    public static VerificationResultResponse confirmed() {
        return new VerificationResultResponse(true);
    }
}
