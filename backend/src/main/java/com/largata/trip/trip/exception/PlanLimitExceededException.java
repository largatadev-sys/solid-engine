package com.largata.trip.trip.exception;

import com.largata.common.error.ValidationException;


public class PlanLimitExceededException extends ValidationException {

    public PlanLimitExceededException(String message) {
        super("PLAN_LIMIT_EXCEEDED", message);
    }
}
