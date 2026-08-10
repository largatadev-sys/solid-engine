package com.largata.itinerary.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;


public record SavePlanRequest(
        @NotNull(message = "A plan save states the version it was built on.")
                @PositiveOrZero(message = "A plan version is never negative.")
                Long basePlanVersion,
        @NotNull(message = "A plan save carries the whole plan.")
                @Size(max = 366, message = "An itinerary has at most 366 days.")
                List<@Valid StagedDay> days) {


    public record StagedDay(
            UUID id,
            @Size(max = 120, message = "A day title may be at most 120 characters.") String title,
            @Size(max = 200, message = "A day holds at most 200 activities.") List<@Valid StagedActivity> activities) {

        public List<StagedActivity> activities() {
            return activities == null ? List.of() : activities;
        }
    }


    public record StagedActivity(UUID id, @NotNull(message = "An activity needs fields.") @Valid ActivityRequest fields) {}


    public List<StagedDay> days() {
        return days == null ? List.of() : days;
    }
}
