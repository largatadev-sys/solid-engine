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
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

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
        // One line, every failure — this is the only place a DomainException is logged (P2).
        // When the exception wraps an infrastructure cause, it is logged here too, so the
        // operator gets the stack without any lower layer logging it a second time.
        if (e.getCause() != null) {
            log.warn(
                    "Domain failure: type={} code={} status={}",
                    e.getClass().getSimpleName(),
                    e.code(),
                    status.value(),
                    e.getCause());
        } else {
            log.warn(
                    "Domain failure: type={} code={} status={}",
                    e.getClass().getSimpleName(),
                    e.code(),
                    status.value());
        }
        return respond(status, e.code(), e.getMessage());
    }

    /**
     * A request for a path that maps to no handler. Spring raises its own exception type for this,
     * so without this handler it falls to {@link #handleUnexpected} and becomes a 500 — wrong per
     * Artifact 05's table, noisy at ERROR for every scanner and typo, and a small information leak:
     * a 500 for "no such route" versus a 404 for "hidden resource" tells a caller which is which,
     * when Artifact 03 wants 404 to mask exactly that difference.
     *
     * <p>Logged at warn, not error: an unknown path is a client mistake, not a server fault.
     */
    @ExceptionHandler({NoHandlerFoundException.class, NoResourceFoundException.class})
    ResponseEntity<ErrorResponse> handleNoHandler(Exception e) {
        log.warn("No handler for request: type={}", e.getClass().getSimpleName());
        return respond(HttpStatus.NOT_FOUND, "NOT_FOUND", "Not found.");
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
            case NotFoundException _ -> HttpStatus.NOT_FOUND;
            case ValidationException _ -> HttpStatus.BAD_REQUEST;
            case ConflictException _ -> HttpStatus.CONFLICT;
            case ForbiddenException _ -> HttpStatus.FORBIDDEN;
            case UnavailableException _ -> HttpStatus.SERVICE_UNAVAILABLE;
            default -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
    }

    private static ResponseEntity<ErrorResponse> respond(HttpStatus status, String code, String message) {
        String traceId = MDC.get(LogContextFilter.TRACE_ID);
        return ResponseEntity.status(status).body(new ErrorResponse(code, message, traceId, Instant.now()));
    }
}
