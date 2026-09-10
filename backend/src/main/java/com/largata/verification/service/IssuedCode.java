package com.largata.verification.service;

import java.time.Instant;


public record IssuedCode(Instant expiresAt, Instant resendAvailableAt) {}
