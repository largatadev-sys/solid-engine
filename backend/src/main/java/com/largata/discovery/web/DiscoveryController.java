package com.largata.discovery.web;

import com.largata.common.api.Page;
import com.largata.identity.Traveler;
import com.largata.common.security.CurrentTraveler;
import com.largata.discovery.DiscoveryFilters;
import com.largata.discovery.DiscoveryService;
import com.largata.discovery.api.DiscoveryCardResponse;
import com.largata.discovery.api.DiscoveryCountResponse;
import com.largata.discovery.api.DiscoverySuggestionsResponse;
import com.largata.discovery.api.PeoplePageResponse;
import com.largata.discovery.api.TrendingDestinationResponse;
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
    PeoplePageResponse people(
            @CurrentTraveler Traveler traveler,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return discovery.people(q, traveler.id(), cursor, limit);
    }
}
