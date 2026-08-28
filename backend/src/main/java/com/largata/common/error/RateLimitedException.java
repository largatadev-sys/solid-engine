package com.largata.common.error;


public abstract class RateLimitedException extends DomainException {

    protected RateLimitedException(String code, String message) {
        super(code, message);
    }
}
