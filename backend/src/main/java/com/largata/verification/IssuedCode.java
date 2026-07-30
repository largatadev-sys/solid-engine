package com.largata.verification;

import java.time.Instant;


public record IssuedCode(Instant expiresAt, Instant resendAvailableAt) {}
