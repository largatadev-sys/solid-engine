package com.largata.verification.dto;

import com.largata.verification.service.IssuedCode;
import java.time.Instant;


public record VerificationCodeResponse(Instant expiresAt, Instant resendAvailableAt) {

    public static VerificationCodeResponse of(IssuedCode issued) {
        return new VerificationCodeResponse(issued.expiresAt(), issued.resendAvailableAt());
    }
}
