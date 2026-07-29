package com.largata.itinerary;

import com.largata.common.error.ValidationException;


class PlanLimitExceededException extends ValidationException {

    PlanLimitExceededException(String message) {
        super("PLAN_LIMIT_EXCEEDED", message);
    }
}
