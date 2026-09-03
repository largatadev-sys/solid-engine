package com.largata.itinerary.api;

import com.largata.itinerary.Itinerary;
import com.largata.itinerary.ItineraryFields;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;


@ChronologicalDates
public record CreateItineraryRequest(
        @NotBlank(message = "A title is required.")
                @Size(max = Itinerary.MAX_TITLE_LENGTH, message = "A title may be at most 120 characters.")
                String title,
        @NotBlank(message = "A destination is required.")
                @Size(max = Itinerary.MAX_DESTINATION_LENGTH, message = "A destination may be at most 120 characters.")
                String destination,
        @Size(max = Itinerary.MAX_DESCRIPTION_LENGTH, message = "A description may be at most 4000 characters.")
                String description,
        LocalDate startDate,
        LocalDate endDate,
        @PositiveOrZero(message = "Duration cannot be negative.")
                @Max(value = Itinerary.MAX_DAYS, message = "An itinerary has at most 366 days.")
                Integer durationDays,
        List<@NotBlank(message = "A standout cannot be blank.") String> standouts,
        @Size(max = Itinerary.MAX_BEST_TIME_LENGTH, message = "Best time of year is at most 60 characters.")
                String bestTimeOfYear,
        @jakarta.validation.Valid PinPayload pin)
        implements HasDateRange {


    @Override
    public LocalDate rangeStart() {
        return startDate;
    }


    @Override
    public LocalDate rangeEnd() {
        return endDate;
    }


    public ItineraryFields toFields() {
        return new ItineraryFields(
                title,
                destination,
                ItineraryFields.DEFAULT_CURRENCY,
                description,
                standouts == null ? List.of() : standouts,
                bestTimeOfYear == null ? "" : bestTimeOfYear,
                startDate,
                endDate,
                PinPayload.toPin(pin));
    }


    public int durationDaysOrZero() {
        return durationDays == null ? 0 : durationDays;
    }
}
