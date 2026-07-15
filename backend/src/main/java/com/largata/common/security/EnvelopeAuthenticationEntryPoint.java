package com.largata.common.security;

import com.largata.common.error.ErrorResponse;
import com.largata.common.logging.LogContextFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Renders the Artifact 05 envelope for requests the security filter chain rejects.
 *
 * <p><strong>Why this class has to exist.</strong> {@code GlobalExceptionHandler} is a {@code
 * @RestControllerAdvice} — it catches what controllers throw. An unauthenticated request never
 * reaches a controller: Spring Security rejects it in the filter chain, in front of the dispatcher
 * servlet, so no advice runs and Spring writes its own envelope-less 401. The client's one rule is
 * "branch on {@code code}" (Artifact 05); a default 401 gives it nothing to branch on. This is
 * Spring Security's designated seam for that response, and it is the only place a 401 body is
 * built.
 *
 * <p><strong>One code for every flavor.</strong> Missing, expired, malformed, and forged tokens all
 * render {@code UNAUTHENTICATED}. The client's reaction is the same in every case (refresh, or go
 * to sign-in), so distinctions it will never branch on would exist only to tell a prober which of
 * their guesses was warmer.
 *
 * <p><strong>Never logs the token or the exception detail.</strong> The failure reason arrives here
 * inside an {@link AuthenticationException} whose message can quote the offending credential (P3:
 * never log tokens). One warn line, code and traceId only.
 */
@Component
public class EnvelopeAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private static final Logger log = LoggerFactory.getLogger(EnvelopeAuthenticationEntryPoint.class);

    private static final String CODE = "UNAUTHENTICATED";
    private static final String MESSAGE = "Authentication required.";

    private final ObjectMapper objectMapper;

    EnvelopeAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(
            HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException {
        String traceId = MDC.get(LogContextFilter.TRACE_ID);

        // Mirrors GlobalExceptionHandler's log-once discipline (P3): one line, no token, no stack.
        // Deliberately no userId in the MDC here — there is no verified principal, and claims from
        // a rejected token are attacker-supplied strings, not identity.
        log.warn("Authentication rejected: code={} status={}", CODE, HttpStatus.UNAUTHORIZED.value());

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(
                response.getOutputStream(), new ErrorResponse(CODE, MESSAGE, traceId, Instant.now()));
    }
}
