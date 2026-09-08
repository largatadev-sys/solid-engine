package com.largata.trip.trip.exception;

import com.largata.common.error.ValidationException;
import java.util.Arrays;
import java.util.stream.Collectors;
import com.largata.trip.trip.entity.TripCategory;


public class UnknownTripCategoryException extends ValidationException {

    public UnknownTripCategoryException(String requested) {
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
