package com.largata.common.error;

import java.time.Instant;


public record ErrorResponse(String code, String message, String traceId, Instant timestamp) {}
