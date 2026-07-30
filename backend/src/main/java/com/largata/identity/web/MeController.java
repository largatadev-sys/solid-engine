package com.largata.identity.web;

import com.largata.identity.Traveler;
import com.largata.identity.TravelerProfileService;
import com.largata.identity.api.MeResponse;
import com.largata.identity.api.UpdateProfileRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/me")
class MeController {

    private final TravelerProfileService profiles;

    MeController(TravelerProfileService profiles) {
        this.profiles = profiles;
    }

    @GetMapping
    MeResponse me(@CurrentTraveler Traveler traveler) {
        return respond(traveler);
    }

    @PatchMapping
    MeResponse update(@CurrentTraveler Traveler traveler, @Valid @RequestBody UpdateProfileRequest request) {
        return respond(profiles.update(traveler.id(), request.toEdit()));
    }

    @PostMapping("/onboarding-completion")
    MeResponse completeOnboarding(@CurrentTraveler Traveler traveler) {
        return respond(profiles.completeOnboarding(traveler.id()));
    }

    private MeResponse respond(Traveler traveler) {
        return MeResponse.of(traveler, profiles.suggestFor(traveler));
    }
}
