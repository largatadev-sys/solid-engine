package com.largata.itinerary.api;

import com.largata.common.geo.PinPayload;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import com.largata.trip.plan.dto.ActivityPhotoResponse;
import com.largata.trip.plan.service.ActivityView;


public record PublishedActivityResponse(
        UUID id,
        int sortOrder,
        String title,
        String timeOfDay,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal costAmount,
        String costCurrency,
        String place,
        PinPayload pin,
        String description,
        String notes,
        String externalUrl,
        String bookingPurpose,
        String bookingProvider,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal bookingPriceAmount,
        String bookingPriceCurrency,
        List<ActivityPhotoResponse> photos) {


    static PublishedActivityResponse of(ActivityView activity) {
        return new PublishedActivityResponse(
                activity.id(),
                activity.sortOrder(),
                activity.title(),
                activity.timeOfDay() == null ? null : activity.timeOfDay().toString(),
                activity.costAmount(),
                activity.costCurrency(),
                activity.place(),
                PinPayload.of(activity.pin()),
                activity.description(),
                activity.notes(),
                activity.externalUrl(),
                activity.bookingPurpose(),
                activity.bookingProvider(),
                activity.bookingPriceAmount(),
                activity.bookingPriceCurrency(),
                ActivityPhotoResponse.allOf(activity.photos()));
    }
}
