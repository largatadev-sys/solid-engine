package com.largata.common.error;


public abstract class ValidationException extends DomainException {

    protected ValidationException(String code, String message) {
        super(code, message);
    }
}
