package com.largata.common.error;

/** Category parent → 404 (06b §3). Also masks the existence of private resources (Artifact 03). */
public abstract class NotFoundException extends DomainException {

    protected NotFoundException(String code, String message) {
        super(code, message);
    }
}
