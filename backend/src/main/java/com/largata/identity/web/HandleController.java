package com.largata.identity.web;

import com.largata.identity.Traveler;
import com.largata.identity.TravelerProfileService;
import com.largata.identity.api.HandleAvailabilityResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/handles")
class HandleController {

    private final TravelerProfileService profiles;

    HandleController(TravelerProfileService profiles) {
        this.profiles = profiles;
    }

    @GetMapping("/{handle}/availability")
    HandleAvailabilityResponse availability(
            @PathVariable String handle, @CurrentTraveler Traveler traveler) {
        return HandleAvailabilityResponse.of(handle, profiles.availability(handle, traveler.id()));
    }
}
