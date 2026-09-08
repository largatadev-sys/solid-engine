package com.largata.trip.validation;

import com.largata.common.error.ValidationException;


public class MissingLeaseSubjectIdException extends ValidationException {

    public MissingLeaseSubjectIdException() {
        super("MISSING_LEASE_SUBJECT_ID", "A day or activity lease names which one.");
    }
}
