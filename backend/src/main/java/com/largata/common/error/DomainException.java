package com.largata.common.error;

/**
 * Root of the exception taxonomy (06b §3). Unchecked, abstract.
 *
 * <p>Every domain failure is one of the category parents below this type; the global handler
 * maps category → HTTP status, so no controller or service ever chooses a status code.
 *
 * <p>{@code code} is the stable machine string the mobile client branches on (Artifact 05) —
 * clients never branch on {@code message}.
 */
public abstract class DomainException extends RuntimeException {

    private final String code;

    protected DomainException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
