package com.largata.itinerary.api;

import com.largata.common.error.ValidationException;


class MissingLeaseSubjectIdException extends ValidationException {

    MissingLeaseSubjectIdException() {
        super("MISSING_LEASE_SUBJECT_ID", "A day or activity lease names which one.");
    }
}
