package com.largata.trip.api;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.UUID;

public record ActivityFacts(
        UUID activityId,
        UUID tripDayId,
        int dayOrdinal,
        String title,
        String dayLabel,
        LocalTime timeOfDay,
        String place,
        BigDecimal latitude,
        BigDecimal longitude,
        Short zoom) {}
