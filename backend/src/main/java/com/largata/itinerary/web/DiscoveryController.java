package com.largata.itinerary.web;

import com.largata.common.api.Page;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.itinerary.DiscoveryService;
import com.largata.itinerary.api.DiscoveryCardResponse;
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
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return discovery.browse(cursor, limit);
    }


    @GetMapping("/recommended")
    List<DiscoveryCardResponse> recommended(@CurrentTraveler Traveler traveler) {
        return discovery.recommended();
    }
}
