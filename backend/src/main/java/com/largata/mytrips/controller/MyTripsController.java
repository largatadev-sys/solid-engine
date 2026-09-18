package com.largata.mytrips.controller;

import com.largata.common.api.Page;
import com.largata.itinerary.api.PublishedItineraries;
import com.largata.common.security.CurrentTraveler;
import com.largata.identity.Traveler;
import com.largata.mytrips.dto.MyTripResponse;
import com.largata.trip.api.TripApi;
import com.largata.trip.api.TripListEntry;
import com.largata.trip.api.TripListQuery;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/trips")
class MyTripsController {

    private final TripApi trips;
    private final PublishedItineraries publication;

    MyTripsController(TripApi trips, PublishedItineraries publication) {
        this.trips = trips;
        this.publication = publication;
    }


    @GetMapping
    Page<MyTripResponse> listMine(
            @CurrentTraveler Traveler traveler,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit,
            @RequestParam(defaultValue = "false") boolean archived,
            @RequestParam(required = false) String category) {
        var page = trips.listFor(new TripListQuery(traveler.id(), cursor, limit, archived, category));
        List<UUID> ids = page.items().stream().map(TripListEntry::id).toList();
        return MyTripResponse.pageOf(page, publication.liveAmong(ids));
    }
}
