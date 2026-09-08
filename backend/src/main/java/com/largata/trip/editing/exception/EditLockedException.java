package com.largata.trip.editing.exception;

import com.largata.common.error.ConflictException;
import com.largata.trip.editing.entity.LeaseSubjectType;


public class EditLockedException extends ConflictException {

    public EditLockedException(String holderLabel, LeaseSubjectType subjectType) {
        super("EDIT_LOCKED", holderLabel + " is editing " + what(subjectType) + " right now.");
    }


    private static String what(LeaseSubjectType subjectType) {
        return switch (subjectType) {
            case HEADER -> "this trip's details";
            case DAY -> "this day";
            case ACTIVITY -> "this activity";
            case SESSION -> "this itinerary";
        };
    }
}
