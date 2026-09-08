package com.largata.trip.editing.exception;

import com.largata.common.error.ValidationException;


public class UnknownLeaseSubjectException extends ValidationException {

    public UnknownLeaseSubjectException(String offered) {
        super("UNKNOWN_LEASE_SUBJECT", "\"" + offered + "\" is not something that can be edited.");
    }
}
