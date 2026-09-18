package com.largata.trip.exception;

import com.largata.common.error.ConflictException;


public class MembershipFrozenException extends ConflictException {

    public MembershipFrozenException() {
        super(
                "MEMBERSHIP_FROZEN",
                "This trip is published, so its travelers are settled. Unpublish it to change who is on the trip.");
    }
}
