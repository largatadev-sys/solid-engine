package com.largata.itinerary.service;

import com.largata.common.geo.Pin;
import com.largata.trip.api.TripPlan;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

record PlanSnapshot(
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
        List<Day> days) {


    static PlanSnapshot of(TripPlan plan) {
        return new PlanSnapshot(
                plan.title(),
                plan.destination(),
                plan.description(),
                plan.currency(),
                plan.standouts(),
                plan.bestTimeOfYear(),
                plan.coverImageUrl(),
                plan.startDate(),
                plan.endDate(),
                plan.pin(),
                plan.days().stream().map(Day::of).toList());
    }


    record Day(int ordinal, String title, List<Activity> activities) {

        static Day of(TripPlan.PlanDay day) {
            return new Day(day.ordinal(), day.title(), day.activities().stream().map(Activity::of).toList());
        }
    }


    record Activity(
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
            List<UUID> photoIds) {

        static Activity of(TripPlan.PlanActivity activity) {
            return new Activity(
                    activity.sortOrder(),
                    activity.title(),
                    activity.timeOfDay(),
                    activity.costAmount(),
                    activity.costCurrency(),
                    activity.place(),
                    activity.description(),
                    activity.notes(),
                    activity.externalUrl(),
                    activity.bookingPurpose(),
                    activity.bookingProvider(),
                    activity.bookingPriceAmount(),
                    activity.bookingPriceCurrency(),
                    activity.pin(),
                    activity.photoIds());
        }
    }
}
