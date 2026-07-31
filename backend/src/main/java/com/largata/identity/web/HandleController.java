package com.largata.identity.web;

import com.largata.identity.IdentityExceptions.NoSuchHandleException;
import com.largata.identity.Traveler;
import com.largata.identity.TravelerProfileService;
import com.largata.identity.TravelerService;
import com.largata.identity.api.HandleAvailabilityResponse;
import com.largata.identity.api.TravelerCardResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/handles")
class HandleController {

    private final TravelerProfileService profiles;
    private final TravelerService travelers;

    HandleController(TravelerProfileService profiles, TravelerService travelers) {
        this.profiles = profiles;
        this.travelers = travelers;
    }

    @GetMapping("/{handle}/availability")
    HandleAvailabilityResponse availability(
            @PathVariable String handle, @CurrentTraveler Traveler traveler) {
        return HandleAvailabilityResponse.of(handle, profiles.availability(handle, traveler.id()));
    }


    @GetMapping("/{handle}")
    TravelerCardResponse lookUp(@PathVariable String handle) {
        return travelers
                .byExactHandle(handle)
                .map(TravelerCardResponse::of)
                .orElseThrow(NoSuchHandleException::new);
    }
}
