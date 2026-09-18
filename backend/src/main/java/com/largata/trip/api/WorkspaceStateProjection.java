package com.largata.trip.api;


public final class WorkspaceStateProjection {

    public static final String ARCHIVED = "archived";

    public static final String COMPLETED = "completed";

    public static final String ACTIVE = "active";

    private WorkspaceStateProjection() {
    }


    public static String of(TripLifecycle lifecycle, boolean archived) {
        if (archived) {
            return ARCHIVED;
        }
        return lifecycle == TripLifecycle.COMPLETED ? COMPLETED : ACTIVE;
    }
}
