package com.largata.trip.plan;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;


public record MoveActivityRequest(
        @NotNull(message = "The target day id is required.") UUID targetDayId) {}
