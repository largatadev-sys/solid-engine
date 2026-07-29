package com.largata.itinerary;

import com.largata.common.error.ConflictException;


class EditLockedException extends ConflictException {

    EditLockedException(String holderDisplayName) {
        super("EDIT_LOCKED", holderDisplayName + " is editing this itinerary right now.");
    }
}
