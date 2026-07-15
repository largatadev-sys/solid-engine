package com.largata.common.error;

import com.largata.common.logging.LogContextFilter;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * The single translation boundary (P2, 06b §3): one handler, logs once, maps to the Artifact 05
 * envelope. No controller or service ever builds an error response or picks a status.
 *
 * <p>This class owns <em>all</em> error-severity logging (06b §4). Services log a warn on
 * business rejection; nothing else logs failures.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(DomainException.class)
    ResponseEntity<ErrorResponse> handleDomain(DomainException e) {
        HttpStatus status = statusOf(e);
        // One line, every failure. traceId ties it to the client's envelope.
        log.warn("Domain failure: type={} code={} status={}", e.getClass().getSimpleName(), e.code(), status.value());
        return respond(status, e.code(), e.getMessage());
    }

    /**
     * Anything unmapped is a bug, not a domain outcome: log at error with the stack trace for the
     * operator, return an opaque envelope to the client (never a Spring default error page).
     */
    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> handleUnexpected(Exception e) {
        log.error("Unhandled exception", e);
        return respond(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Something went wrong.");
    }

    private static HttpStatus statusOf(DomainException e) {
        return switch (e) {
            case NotFoundException ignored -> HttpStatus.NOT_FOUND;
            case ValidationException ignored -> HttpStatus.BAD_REQUEST;
            case ConflictException ignored -> HttpStatus.CONFLICT;
            case ForbiddenException ignored -> HttpStatus.FORBIDDEN;
            case UnavailableException ignored -> HttpStatus.SERVICE_UNAVAILABLE;
            default -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
    }

    private static ResponseEntity<ErrorResponse> respond(HttpStatus status, String code, String message) {
        String traceId = MDC.get(LogContextFilter.TRACE_ID);
        return ResponseEntity.status(status).body(new ErrorResponse(code, message, traceId, Instant.now()));
    }
}
