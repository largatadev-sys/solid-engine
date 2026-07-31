package com.largata.itinerary;

import java.util.Locale;


public enum HistoryAct {
    HEADER_EDITED,
    DAY_ADDED,
    DAY_RENAMED,
    DAY_DELETED,
    ACTIVITY_ADDED,
    ACTIVITY_EDITED,
    ACTIVITY_DELETED,
    ACTIVITY_MOVED,
    ACTIVITIES_REORDERED;


    public String wireName() {
        return name().toLowerCase(Locale.ROOT);
    }
}
