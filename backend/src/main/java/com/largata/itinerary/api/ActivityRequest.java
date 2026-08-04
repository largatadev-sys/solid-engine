package com.largata.itinerary.api;

import com.largata.itinerary.ActivityFields;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;


public record ActivityRequest(
        @NotBlank(message = "An activity needs a title.")
                @Size(max = 200, message = "A title may be at most 200 characters.")
                String title,
        @Pattern(
                        regexp = "^$|^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$",
                        message = "A time of day must look like 14:00.")
                String timeOfDay,
        @Pattern(regexp = "^$|^\\d+(\\.\\d{1,2})?$", message = "An estimated cost must be a number like 500 or 500.00.")
                String costAmount,
        @Size(max = 8, message = "A currency code may be at most 8 characters.") String costCurrency,
        @Size(max = 500, message = "A place may be at most 500 characters.") String place,
        @Size(max = 4000, message = "A description may be at most 4000 characters.") String description,
        @Size(max = 4000, message = "Notes may be at most 4000 characters.") String notes,
        @Size(max = 500, message = "A link may be at most 500 characters.") String externalUrl,
        @Size(max = 500, message = "A booking purpose may be at most 500 characters.") String bookingPurpose,
        @Size(max = 500, message = "A booking provider may be at most 500 characters.") String bookingProvider,
        @Pattern(
                        regexp = "^$|^\\d+(\\.\\d{1,2})?$",
                        message = "A booking price must be a number like 1800 or 1800.00.")
                String bookingPriceAmount,
        @Size(max = 8, message = "A currency code may be at most 8 characters.") String bookingPriceCurrency) {


    public ActivityFields toFields() {
        return new ActivityFields(
                title, parseTime(timeOfDay), parseAmount(costAmount), costCurrency, place, description, notes,
                externalUrl, bookingPurpose, bookingProvider, parseAmount(bookingPriceAmount), bookingPriceCurrency);
    }

    private static LocalTime parseTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalTime.parse(value.strip());
        } catch (DateTimeParseException notATime) {
            throw new IllegalArgumentException("A time of day must look like 14:00", notATime);
        }
    }

    private static BigDecimal parseAmount(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(value.strip());
        } catch (NumberFormatException notANumber) {
            throw new IllegalArgumentException("An estimated cost must be a number", notANumber);
        }
    }
}
