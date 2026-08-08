package com.largata.itinerary;

import java.util.UUID;


public record LeaseSubject(LeaseSubjectType type, UUID id) {

    public LeaseSubject {
        if (type == null || id == null) {
            throw new IllegalArgumentException("A lease subject names a type and an id");
        }
    }


    public static LeaseSubject header(UUID itineraryId) {
        return new LeaseSubject(LeaseSubjectType.HEADER, itineraryId);
    }


    public static LeaseSubject day(UUID dayId) {
        return new LeaseSubject(LeaseSubjectType.DAY, dayId);
    }


    public static LeaseSubject activity(UUID activityId) {
        return new LeaseSubject(LeaseSubjectType.ACTIVITY, activityId);
    }


    public static LeaseSubject session(UUID itineraryId) {
        return new LeaseSubject(LeaseSubjectType.SESSION, itineraryId);
    }
}
