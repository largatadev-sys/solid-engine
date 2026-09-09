package com.largata.itinerary.api;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface ItineraryApi {

    Map<UUID, UUID> objectIdsByTrip(List<UUID> tripIds);
}
