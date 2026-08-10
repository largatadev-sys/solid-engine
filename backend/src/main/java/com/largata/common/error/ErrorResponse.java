package com.largata.common.error;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.Map;


public record ErrorResponse(
        String code,
        String message,
        String traceId,
        Instant timestamp,
        @JsonInclude(JsonInclude.Include.NON_NULL) Map<String, Object> details) {

    public ErrorResponse(String code, String message, String traceId, Instant timestamp) {
        this(code, message, traceId, timestamp, null);
    }
}
