package com.largata.common.error;

/** Category parent → 403 (06b §3). */
public abstract class ForbiddenException extends DomainException {

    protected ForbiddenException(String code, String message) {
        super(code, message);
    }
}
