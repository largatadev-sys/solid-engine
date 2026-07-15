package com.largata.common.error;

/** Category parent → 400 (06b §3). */
public abstract class ValidationException extends DomainException {

    protected ValidationException(String code, String message) {
        super(code, message);
    }
}
