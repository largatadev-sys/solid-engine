package com.largata.itinerary.api;

import com.largata.itinerary.Itinerary;
import com.largata.itinerary.ItineraryFields;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;


@ChronologicalDates
public record UpdateItineraryRequest(
        @NotBlank(message = "A title is required.")
                @Size(max = Itinerary.MAX_TITLE_LENGTH, message = "A title may be at most 120 characters.")
                String title,
        @NotBlank(message = "A destination is required.")
                @Size(max = Itinerary.MAX_DESTINATION_LENGTH, message = "A destination may be at most 120 characters.")
                String destination,
        Patchable<String> currency,
        Patchable<String> description,
        Patchable<List<String>> standouts,
        Patchable<String> bestTimeOfYear,
        Patchable<LocalDate> startDate,
        Patchable<LocalDate> endDate,
        Patchable<@jakarta.validation.Valid PinPayload> pin)
        implements HasDateRange {


    @Override
    public LocalDate rangeStart() {
        return Patchable.isAbsent(startDate) ? null : startDate.value();
    }


    @Override
    public LocalDate rangeEnd() {
        return Patchable.isAbsent(endDate) ? null : endDate.value();
    }


    public ItineraryFields mergeOnto(ItineraryFields current) {
        return new ItineraryFields(
                title,
                destination,
                requirePresent(currency, current.currency(), "A currency cannot be cleared."),
                Patchable.applyTo(description, current.description()),
                standoutsOnto(current.standouts()),
                bestTimeOfYearOnto(current.bestTimeOfYear()),
                Patchable.applyTo(startDate, current.startDate()),
                Patchable.applyTo(endDate, current.endDate()),
                pinOnto(current.pin()));
    }


    private com.largata.itinerary.Pin pinOnto(com.largata.itinerary.Pin current) {
        if (Patchable.isAbsent(pin)) {
            return current;
        }
        return pin.clears() ? null : PinPayload.toPin(pin.value());
    }


    private List<String> standoutsOnto(List<String> current) {
        if (Patchable.isAbsent(standouts)) {
            return current;
        }
        return standouts.clears() ? List.of() : standouts.value();
    }


    private String bestTimeOfYearOnto(String current) {
        if (Patchable.isAbsent(bestTimeOfYear)) {
            return current;
        }
        return bestTimeOfYear.clears() ? "" : bestTimeOfYear.value();
    }


    private static String requirePresent(Patchable<String> patch, String current, String message) {
        if (Patchable.isAbsent(patch)) {
            return current;
        }
        if (patch.clears()) {
            throw new ClearingWhatCannotBeClearedException(message);
        }
        return patch.value();
    }
}
