package com.largata.trip.plan.dto;

import com.largata.trip.trip.entity.Trip;
import jakarta.validation.constraints.Size;


public record DayRequest(
        @Size(max = Trip.MAX_DAY_TITLE_LENGTH, message = "A day title may be at most 120 characters.")
                String title) {}
