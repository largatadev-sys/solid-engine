package com.largata.verification.service;

import java.util.UUID;


public record VerificationMail(UUID travelerId, String recipientEmail, String code) {}
