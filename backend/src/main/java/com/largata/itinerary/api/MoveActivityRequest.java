package com.largata.itinerary.api;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;


public record MoveActivityRequest(
        @NotNull(message = "The target day id is required.") UUID targetDayId) {}
