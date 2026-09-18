package com.largata.trip.api;

public final class InAudience {

    private final Membership cleared;

    InAudience(Membership cleared) {
        this.cleared = cleared;
    }

    public Membership member() {
        return cleared;
    }
}
