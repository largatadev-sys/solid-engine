package com.largata.common.error;

/** Category parent → 409 (06b §3). Includes illegal state transitions. */
public abstract class ConflictException extends DomainException {

    protected ConflictException(String code, String message) {
        super(code, message);
    }
}
