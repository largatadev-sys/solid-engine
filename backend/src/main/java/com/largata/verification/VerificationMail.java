package com.largata.verification;

import java.util.UUID;


record VerificationMail(UUID travelerId, String recipientEmail, String code) {}
