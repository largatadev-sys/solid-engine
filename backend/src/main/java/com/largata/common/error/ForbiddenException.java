package com.largata.common.error;


public abstract class ForbiddenException extends DomainException {

    protected ForbiddenException(String code, String message) {
        super(code, message);
    }
}
