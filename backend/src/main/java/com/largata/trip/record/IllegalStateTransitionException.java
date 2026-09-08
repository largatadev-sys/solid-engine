package com.largata.trip.record;

import com.largata.common.error.ConflictException;
import com.largata.trip.api.TripLifecycle;


public class IllegalStateTransitionException extends ConflictException {

    IllegalStateTransitionException(TripLifecycle from, TripLifecycle to) {
        super(
                "ILLEGAL_STATE_TRANSITION",
                "This trip is " + from.wireName() + " and cannot become " + to.wireName() + ".");
    }

    private IllegalStateTransitionException(String message) {
        super("ILLEGAL_STATE_TRANSITION", message);
    }


    static IllegalStateTransitionException atTheFloor(TripLifecycle floor) {
        return new IllegalStateTransitionException(
                "This trip is " + floor.wireName() + ", which is where a trip starts — there is nothing before it.");
    }


    static IllegalStateTransitionException planningIsNoLongerAState() {
        return new IllegalStateTransitionException(
                "Trips no longer need their planning finished — a trip is upcoming from the moment it is created.");
    }
}
