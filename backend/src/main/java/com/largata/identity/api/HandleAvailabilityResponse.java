package com.largata.identity.api;

import com.largata.identity.Handle;


public record HandleAvailabilityResponse(String handle, boolean available, String status) {

    public static HandleAvailabilityResponse of(String requested, Handle.Availability availability) {
        return new HandleAvailabilityResponse(
                Handle.normalize(requested),
                availability == Handle.Availability.FREE,
                availability.wireName());
    }
}
