package com.largata.join.web;

import com.largata.identity.Traveler;
import com.largata.join.JoinService;
import com.largata.media.web.PhotoBytes;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/join")
class JoinController {

    private final JoinService join;
    private final OptionalViewer viewer;
    private final PhotoBytes covers;

    JoinController(JoinService join, OptionalViewer viewer, PhotoBytes covers) {
        this.join = join;
        this.viewer = viewer;
        this.covers = covers;
    }


    @GetMapping("/{token}")
    JoinTeaserResponse teaser(@PathVariable String token) {
        return JoinTeaserResponse.of(join.teaserFor(token, viewer.id()));
    }


    @GetMapping("/{token}/cover")
    ResponseEntity<InputStreamResource> cover(@PathVariable String token) {
        return covers.anonymousThumbnailOfItinerary(join.itineraryBehind(token));
    }


    @PostMapping("/{token}/request")
    JoinRequestResponse request(@PathVariable String token) {
        Jwt credential = viewer.token().orElseThrow(SignInRequiredException::new);
        Traveler traveler = viewer.travelerOf(credential);
        return new JoinRequestResponse(
                join.request(token, viewer.contactOf(credential), traveler.id()).wireName());
    }
}
