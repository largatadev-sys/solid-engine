package com.largata.place.web;

import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/places")
class MapConfigController {

    private final MapConfigResponse config;

    MapConfigController(
            @Value("${largata.place.tile-url}") String tileUrl,
            @Value("${largata.place.tile-attribution}") String attribution,
            @Value("${largata.place.tile-attribution-url}") String attributionUrl) {
        this.config = new MapConfigResponse(tileUrl, attribution, attributionUrl);
    }


    @GetMapping("/map-config")
    MapConfigResponse mapConfig(@CurrentTraveler Traveler traveler) {
        return config;
    }
}
