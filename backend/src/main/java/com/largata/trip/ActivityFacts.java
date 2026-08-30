package com.largata.trip;

import java.time.LocalTime;
import java.util.UUID;


public record ActivityFacts(
        UUID activityId, String title, String dayLabel, LocalTime timeOfDay, String place) {}
