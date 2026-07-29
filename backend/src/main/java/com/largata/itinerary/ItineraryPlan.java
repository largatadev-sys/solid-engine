package com.largata.itinerary;

import java.util.List;


public record ItineraryPlan(Itinerary itinerary, List<DayView> days, boolean archived) {}
