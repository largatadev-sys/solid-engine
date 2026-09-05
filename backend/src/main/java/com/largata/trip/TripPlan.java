package com.largata.trip;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;


public record TripPlan(
        UUID id,
        UUID ownerId,
        String title,
        String destination,
        String description,
        String currency,
        List<String> standouts,
        String bestTimeOfYear,
        String coverImageUrl,
        LocalDate startDate,
        LocalDate endDate,
        TripLifecycle lifecycle,
        boolean published,
        List<PlanDay> days) {


    public record PlanDay(int ordinal, String title, List<PlanActivity> activities) {}


    public record PlanActivity(
            int sortOrder,
            String title,
            String timeOfDay,
            BigDecimal costAmount,
            String costCurrency,
            String place,
            String description,
            String notes,
            String externalUrl,
            String bookingPurpose,
            String bookingProvider,
            BigDecimal bookingPriceAmount,
            String bookingPriceCurrency) {}
}
