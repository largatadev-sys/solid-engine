package com.largata.trip.api;

import java.util.UUID;


public record TripListQuery(
        UUID travelerId, String cursor, Integer limit, boolean archived, String category) {}
