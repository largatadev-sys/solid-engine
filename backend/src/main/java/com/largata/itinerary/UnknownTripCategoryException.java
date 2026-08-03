package com.largata.itinerary;

import com.largata.common.error.ValidationException;
import java.util.Arrays;
import java.util.stream.Collectors;


class UnknownTripCategoryException extends ValidationException {

    UnknownTripCategoryException(String requested) {
        super(
                "UNKNOWN_TRIP_CATEGORY",
                "There is no trip category \""
                        + requested
                        + "\". Use one of: "
                        + Arrays.stream(TripCategory.values())
                                .map(TripCategory::wireName)
                                .collect(Collectors.joining(", "))
                        + ".");
    }
}
