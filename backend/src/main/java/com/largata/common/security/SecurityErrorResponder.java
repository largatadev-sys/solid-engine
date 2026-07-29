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
