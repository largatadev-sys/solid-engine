package com.largata.itinerary.api;

import com.largata.itinerary.Itinerary;
import jakarta.validation.constraints.Size;


public record DayRequest(
        @Size(max = Itinerary.MAX_DAY_TITLE_LENGTH, message = "A day title may be at most 120 characters.")
                String title) {}
