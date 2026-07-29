package com.largata.common.error;


public abstract class UnavailableException extends DomainException {

    protected UnavailableException(String code, String message) {
        super(code, message);
    }

    protected UnavailableException(String code, String message, Throwable cause) {
        super(code, message, cause);
    }
}
