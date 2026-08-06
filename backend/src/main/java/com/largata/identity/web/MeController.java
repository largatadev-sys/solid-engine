package com.largata.identity.web;

import com.largata.identity.Traveler;
import com.largata.identity.TravelerProfileService;
import com.largata.identity.api.MeResponse;
import com.largata.identity.api.UpdateProfileRequest;
import jakarta.validation.Valid;
import java.io.IOException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;


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

    @PostMapping("/avatar")
    MeResponse uploadAvatar(@CurrentTraveler Traveler traveler, @RequestPart("photo") MultipartFile photo)
            throws IOException {
        return respond(profiles.replaceAvatar(traveler.id(), photo.getBytes()));
    }

    @DeleteMapping("/avatar")
    MeResponse removeAvatar(@CurrentTraveler Traveler traveler) {
        return respond(profiles.removeAvatar(traveler.id()));
    }

    private MeResponse respond(Traveler traveler) {
        return MeResponse.of(traveler, profiles.suggestFor(traveler));
    }
}
