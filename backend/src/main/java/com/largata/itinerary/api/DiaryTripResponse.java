package com.largata.itinerary.api;

import java.util.UUID;


public record DiaryTripResponse(UUID itineraryId, String title, long entryCount) {}
