package com.largata.identity.web;

import com.largata.identity.Traveler;
import com.largata.identity.api.MeResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/me")
class MeController {

    @GetMapping
    MeResponse me(@CurrentTraveler Traveler traveler) {
        return MeResponse.of(traveler);
    }
}
