package com.largata.trip;

import java.util.UUID;


public record TripDayFacts(UUID dayId, int ordinal, String title, String dayLabel) {}
