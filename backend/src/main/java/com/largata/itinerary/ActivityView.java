package com.largata.itinerary;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;


public record ActivityView(
        UUID id,
        int sortOrder,
        String title,
        LocalTime timeOfDay,
        BigDecimal costAmount,
        String costCurrency,
        String place,
        String description,
        String notes,
        String externalUrl,
        String bookingPurpose,
        String bookingProvider,
        BigDecimal bookingPriceAmount,
        String bookingPriceCurrency,
        UUID lastEditedBy,
        Instant lastEditedAt,
        List<ActivityPhotoView> photos) {

    static ActivityView of(Activity a) {
        return of(a, List.of());
    }


    static ActivityView of(Activity a, List<ActivityPhotoView> photos) {
        return new ActivityView(
                a.id(),
                a.sortOrder(),
                a.title(),
                a.timeOfDay(),
                a.costAmount(),
                a.costCurrency(),
                a.place(),
                a.description(),
                a.notes(),
                a.externalUrl(),
                a.bookingPurpose(),
                a.bookingProvider(),
                a.bookingPriceAmount(),
                a.bookingPriceCurrency(),
                a.lastEditedBy(),
                a.lastEditedAt(),
                photos);
    }
}
