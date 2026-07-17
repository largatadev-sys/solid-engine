package com.largata.common.security;

import com.largata.common.error.ErrorResponse;
import com.largata.common.logging.LogContextFilter;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Writes the Artifact 05 envelope for failures raised inside the security filter chain.
 *
 * <p><strong>Why this exists at all.</strong> {@code GlobalExceptionHandler} is a {@code
 * @RestControllerAdvice} — it catches what controllers throw. Security rejects a request in the
 * filter chain, in front of the dispatcher servlet, so no advice runs and Spring writes its own
 * envelope-less response. The client's one rule is "branch on {@code code}" (Artifact 05); a
 * default 401 gives it nothing to branch on. This is the security chain's half of P2's "one
 * translation boundary" — the only place a 401 or 403 body is built.
 *
 * <p><strong>Never logs the token or the exception detail.</strong> The failure reason arrives
 * inside an exception whose message can quote the offending credential (P3: never log tokens). One
 * warn line, code and traceId only — mirroring {@code GlobalExceptionHandler}'s log-once discipline.
 */
@Component
class SecurityErrorResponder {

    private static final Logger log = LoggerFactory.getLogger(SecurityErrorResponder.class);

    private final ObjectMapper objectMapper;

    SecurityErrorResponder(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    void respond(HttpServletResponse response, HttpStatus status, String code, String message)
            throws IOException {
        String traceId = MDC.get(LogContextFilter.TRACE_ID);

        log.warn("Security rejection: code={} status={}", code, status.value());

        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(
                response.getOutputStream(), new ErrorResponse(code, message, traceId, Instant.now()));
    }
}
