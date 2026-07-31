package com.largata.itinerary;

import com.largata.common.error.ConflictException;


class EditLockedException extends ConflictException {

    EditLockedException(String holderLabel, LeaseSubjectType subjectType) {
        super("EDIT_LOCKED", holderLabel + " is editing " + what(subjectType) + " right now.");
    }


    private static String what(LeaseSubjectType subjectType) {
        return switch (subjectType) {
            case HEADER -> "this trip's details";
            case DAY -> "this day";
            case ACTIVITY -> "this activity";
        };
    }
}
