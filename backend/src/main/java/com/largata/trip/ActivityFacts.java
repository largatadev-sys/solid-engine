package com.largata.trip;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.UUID;


public record ActivityFacts(
        UUID activityId,
        String title,
        String dayLabel,
        LocalTime timeOfDay,
        String place,
        BigDecimal latitude,
        BigDecimal longitude,
        Short zoom) {}
