package com.largata.itinerary.api;

import com.largata.itinerary.Itinerary;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;


@ChronologicalDates
public record CreateItineraryRequest(
        @NotBlank(message = "A title is required.")
                @Size(max = Itinerary.MAX_TITLE_LENGTH, message = "A title may be at most 120 characters.")
                String title,
        @NotEmpty(message = "At least one destination is required.")
                List<@NotBlank(message = "A destination cannot be blank.") String> destinations,
        @Size(max = Itinerary.MAX_DESCRIPTION_LENGTH, message = "A description may be at most 4000 characters.")
                String description,
        LocalDate startDate,
        LocalDate endDate,
        @PositiveOrZero(message = "Duration cannot be negative.")
                @Max(value = Itinerary.MAX_DAYS, message = "An itinerary has at most 366 days.")
                Integer durationDays)
        implements HasDateRange {


    public int durationDaysOrZero() {
        return durationDays == null ? 0 : durationDays;
    }
}
