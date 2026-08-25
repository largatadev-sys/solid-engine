package com.largata.itinerary.web;

import com.largata.common.api.Page;
import com.largata.identity.Traveler;
import com.largata.identity.api.TravelerCardResponse;
import com.largata.identity.web.CurrentTraveler;
import com.largata.itinerary.DiscoveryFilters;
import com.largata.itinerary.DiscoveryService;
import com.largata.itinerary.api.DiscoveryCardResponse;
import com.largata.itinerary.api.DiscoveryCountResponse;
import com.largata.itinerary.api.DiscoverySuggestionsResponse;
import com.largata.itinerary.api.TrendingDestinationResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/discovery")
class DiscoveryController {

    private final DiscoveryService discovery;

    DiscoveryController(DiscoveryService discovery) {
        this.discovery = discovery;
    }


    @GetMapping("/itineraries")
    Page<DiscoveryCardResponse> browse(
            @CurrentTraveler Traveler traveler,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String destination,
            @RequestParam(required = false) String duration,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return discovery.browse(DiscoveryFilters.of(q, destination, duration), cursor, limit);
    }


    @GetMapping("/count")
    DiscoveryCountResponse count(
            @CurrentTraveler Traveler traveler,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String destination,
            @RequestParam(required = false) String duration) {
        return discovery.count(DiscoveryFilters.of(q, destination, duration));
    }


    @GetMapping("/recommended")
    List<DiscoveryCardResponse> recommended(@CurrentTraveler Traveler traveler) {
        return discovery.recommended();
    }


    @GetMapping("/trending")
    List<TrendingDestinationResponse> trending(@CurrentTraveler Traveler traveler) {
        return discovery.trending();
    }


    @GetMapping("/suggestions")
    DiscoverySuggestionsResponse suggestions(
            @CurrentTraveler Traveler traveler, @RequestParam(required = false) String q) {
        return discovery.suggestions(DiscoveryFilters.of(q, null, null), traveler.id());
    }


    @GetMapping("/people")
    Page<TravelerCardResponse> people(
            @CurrentTraveler Traveler traveler,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return discovery.people(q, traveler.id(), cursor, limit);
    }
}
