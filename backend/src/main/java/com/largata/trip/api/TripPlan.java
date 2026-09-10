package com.largata.trip.api;

import com.largata.common.geo.Pin;
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
        Pin pin,
        TripLifecycle lifecycle,
        boolean published,
        List<PlanDay> days) {


    public TripPlan withDays(List<PlanDay> days) {
        return new TripPlan(
                id,
                ownerId,
                title,
                destination,
                description,
                currency,
                standouts,
                bestTimeOfYear,
                coverImageUrl,
                startDate,
                endDate,
                pin,
                lifecycle,
                published,
                days);
    }


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
            String bookingPriceCurrency,
            Pin pin,
            List<UUID> photoIds) {}
}
