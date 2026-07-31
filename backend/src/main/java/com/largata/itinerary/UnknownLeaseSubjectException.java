package com.largata.itinerary;

import com.largata.common.error.ValidationException;


class UnknownLeaseSubjectException extends ValidationException {

    UnknownLeaseSubjectException(String offered) {
        super("UNKNOWN_LEASE_SUBJECT", "\"" + offered + "\" is not something that can be edited.");
    }
}
