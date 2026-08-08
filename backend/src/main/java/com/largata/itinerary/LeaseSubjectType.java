package com.largata.itinerary;

import java.util.Locale;


public enum LeaseSubjectType {
    HEADER,
    DAY,
    ACTIVITY,
    SESSION;


    public String wireName() {
        return name().toLowerCase(Locale.ROOT);
    }


    public static LeaseSubjectType fromWireName(String wireName) {
        if (wireName == null) {
            return HEADER;
        }
        for (LeaseSubjectType candidate : values()) {
            if (candidate.wireName().equals(wireName.strip().toLowerCase(Locale.ROOT))) {
                return candidate;
            }
        }
        throw new UnknownLeaseSubjectException(wireName);
    }
}
