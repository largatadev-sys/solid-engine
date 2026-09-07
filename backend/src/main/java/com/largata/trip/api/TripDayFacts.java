package com.largata.trip.api;

import java.util.UUID;

public record TripDayFacts(UUID dayId, int ordinal, String title, String dayLabel) {}
