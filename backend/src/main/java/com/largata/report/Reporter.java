package com.largata.report;

import java.util.UUID;


public record Reporter(UUID travelerId, String name) {

    public static Reporter of(UUID travelerId, String displayName) {
        return new Reporter(travelerId, displayName == null || displayName.isBlank() ? null : displayName);
    }
}
