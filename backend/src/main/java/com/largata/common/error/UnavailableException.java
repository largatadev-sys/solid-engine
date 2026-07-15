package com.largata.common.error;

/**
 * Category parent → 503.
 *
 * <p>Extends 06b §3's four categories. Rationale (S0.1, ticket 02): the health slice must report
 * a dependency outage, and none of NotFound/Validation/Conflict/Forbidden fits — a datastore
 * outage is neither the caller's fault nor a domain rule rejection. Without this category the
 * only options were an untyped 500 (leaking a Spring error page, violating P2) or misusing an
 * existing category. Recorded as an amendment to 06b §3 rather than an accident.
 */
public abstract class UnavailableException extends DomainException {

    protected UnavailableException(String code, String message) {
        super(code, message);
    }
}
