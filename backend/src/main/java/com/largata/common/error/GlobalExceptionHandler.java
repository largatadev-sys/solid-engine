package com.largata.common.error;

import com.largata.common.logging.LogContextFilter;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.context.support.DefaultMessageSourceResolvable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
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
     * Authorization denied at the <em>method</em> layer ({@code @PreAuthorize} and friends).
     *
     * <p>Spring Security denies access at two layers that surface differently. Filter-layer denials
     * (the {@code authorizeHttpRequests} rules) never reach a controller and are answered by {@code
     * EnvelopeAccessDeniedHandler}. Method-layer denials are thrown <em>from</em> the controller, so
     * they land here — and without this handler they fall to {@link #handleUnexpected} and become a
     * <strong>500</strong>: logged at ERROR as if the server were broken, and telling the client
     * "something went wrong" when the truth is "you may not do that". Found by the first test that
     * could produce a 403 at all (S0.2); Artifact 05 says 403.
     *
     * <p>Logged at warn, not error: a refused permission is a correct outcome, not a fault.
     */
    @ExceptionHandler(AuthorizationDeniedException.class)
    ResponseEntity<ErrorResponse> handleAuthorizationDenied(AuthorizationDeniedException e) {
        log.warn("Authorization denied: code=FORBIDDEN status={}", HttpStatus.FORBIDDEN.value());
        return respond(HttpStatus.FORBIDDEN, "FORBIDDEN", "You may not do that.");
    }

    /**
     * A request body that failed Bean Validation ({@code @Valid} on a controller parameter).
     *
     * <p>Spring raises its own type for this, so without this handler it falls to {@link
     * #handleUnexpected} and becomes a <strong>500</strong> for what is plainly a client mistake —
     * logged at ERROR, and answering "something went wrong" when the truth is "your title is blank".
     * Artifact 05 says 400.
     *
     * <p><strong>The first field's message becomes the envelope's message</strong>, deliberately. The
     * envelope has one {@code message} field (Artifact 05) and clients branch on {@code code}, never
     * on prose — so a structured per-field map would be a second error shape invented for one
     * endpoint. The messages are written to be shown as-is; the mobile form surfaces this one against
     * the field the client already knows it sent. If per-field mapping is ever genuinely needed, it
     * arrives as an additive field, decided as a convention rather than improvised here.
     *
     * <p>Logged at warn, not error: rejecting a bad request is the system working.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorResponse> handleInvalidBody(MethodArgumentNotValidException e) {
        // getAllErrors(), not getFieldErrors(): a cross-field rule (@ChronologicalDates) is a
        // class-level constraint and reports as a *global* error with no field attached. Reading
        // only field errors would answer "That request is not valid." for the one validation
        // failure whose message is actually worth showing.
        String message =
                e.getBindingResult().getAllErrors().stream()
                        .findFirst()
                        .map(DefaultMessageSourceResolvable::getDefaultMessage)
                        .orElse("That request is not valid.");
        log.warn("Invalid request body: code=VALIDATION_FAILED status={}", HttpStatus.BAD_REQUEST.value());
        return respond(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", message);
    }

    /**
     * A malformed body Jackson could not read at all, or a path/query parameter of the wrong type
     * ({@code /v1/itineraries/not-a-uuid}).
     *
     * <p>Same reasoning as above: garbage from a client is a 400, and without this it is a 500 that
     * pages someone. The message stays generic — a parse error's detail names internal types and
     * would leak them into the envelope (P2).
     */
    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<ErrorResponse> handleUnreadableRequest(Exception e) {
        log.warn("Unreadable request: type={} status={}", e.getClass().getSimpleName(), HttpStatus.BAD_REQUEST.value());
        return respond(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST", "That request could not be read.");
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
