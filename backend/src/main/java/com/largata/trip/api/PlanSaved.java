package com.largata.trip.api;

import java.time.Instant;
import java.util.UUID;


public record PlanSaved(UUID tripId, long planVersion, int dayCount, Instant lastEditedAt) {}
