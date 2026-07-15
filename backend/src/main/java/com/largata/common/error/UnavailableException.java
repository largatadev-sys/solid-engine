package com.largata.common.error;

/**
 * Category parent → 503.
 *
 * <p>The fifth category, added at S0.1 alongside 06b §3's original four. The rationale lives in
 * 06b §3 and 05's status list — this class is the code half of a documented standard, not a local
 * invention.
 */
public abstract class UnavailableException extends DomainException {

    protected UnavailableException(String code, String message) {
        super(code, message);
    }

    protected UnavailableException(String code, String message, Throwable cause) {
        super(code, message, cause);
    }
}
