package com.largata.common.error;

import com.largata.common.logging.LogContextFilter;
import java.time.Instant;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.context.support.DefaultMessageSourceResolvable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;


@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(DomainException.class)
    ResponseEntity<ErrorResponse> handleDomain(DomainException e) {
        HttpStatus status = statusOf(e);
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
        return respond(status, e.code(), e.getMessage(), e.details());
    }


    @ExceptionHandler({NoHandlerFoundException.class, NoResourceFoundException.class})
    ResponseEntity<ErrorResponse> handleNoHandler(Exception e) {
        log.warn("No handler for request: type={}", e.getClass().getSimpleName());
        return respond(HttpStatus.NOT_FOUND, "NOT_FOUND", "Not found.");
    }


    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ErrorResponse> handleWrongMethod(HttpRequestMethodNotSupportedException e) {
        log.warn("Method not supported on this route: method={}", e.getMethod());
        return respond(
                HttpStatus.METHOD_NOT_ALLOWED,
                "METHOD_NOT_ALLOWED",
                "That is not something this address does.");
    }


    @ExceptionHandler(AuthorizationDeniedException.class)
    ResponseEntity<ErrorResponse> handleAuthorizationDenied(AuthorizationDeniedException e) {
        log.warn("Authorization denied: code=FORBIDDEN status={}", HttpStatus.FORBIDDEN.value());
        return respond(HttpStatus.FORBIDDEN, "FORBIDDEN", "You may not do that.");
    }


    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorResponse> handleInvalidBody(MethodArgumentNotValidException e) {
        String message =
                e.getBindingResult().getAllErrors().stream()
                        .findFirst()
                        .map(DefaultMessageSourceResolvable::getDefaultMessage)
                        .orElse("That request is not valid.");
        log.warn("Invalid request body: code=VALIDATION_FAILED status={}", HttpStatus.BAD_REQUEST.value());
        return respond(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", message);
    }


    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<ErrorResponse> handleUnreadableRequest(Exception e) {
        log.warn("Unreadable request: type={} status={}", e.getClass().getSimpleName(), HttpStatus.BAD_REQUEST.value());
        return respond(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST", "That request could not be read.");
    }


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
            case RateLimitedException _ -> HttpStatus.TOO_MANY_REQUESTS;
            case UnavailableException _ -> HttpStatus.SERVICE_UNAVAILABLE;
            default -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
    }

    private static ResponseEntity<ErrorResponse> respond(HttpStatus status, String code, String message) {
        return respond(status, code, message, null);
    }

    private static ResponseEntity<ErrorResponse> respond(
            HttpStatus status, String code, String message, Map<String, Object> details) {
        String traceId = MDC.get(LogContextFilter.TRACE_ID);
        return ResponseEntity.status(status)
                .body(new ErrorResponse(code, message, traceId, Instant.now(), details));
    }
}
