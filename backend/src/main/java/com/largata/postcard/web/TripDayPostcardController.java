package com.largata.postcard.web;

import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.postcard.PostcardService;
import com.largata.trip.TripExceptions.TripNotFoundException;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;


@RestController
@RequestMapping("/v1/trips/{tripId}/days/{dayId}/postcards")
class TripDayPostcardController {

    private final PostcardService postcards;
    private final AuthorizationGuard guard;
    private final ObjectMapper json;

    TripDayPostcardController(
            PostcardService postcards, AuthorizationGuard guard, ObjectMapper json) {
        this.postcards = postcards;
        this.guard = guard;
        this.json = json;
    }


    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    PostcardResponse post(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID tripId,
            @PathVariable UUID dayId,
            @RequestPart(name = "postcard", required = false) String postcardJson,
            @RequestPart(name = "photos", required = false) List<MultipartFile> devicePhotos)
            throws IOException {
        Membership member = requireMember(traveler, tripId);
        PostOnDayRequest request =
                postcardJson == null
                        ? new PostOnDayRequest(null, null, null)
                        : json.readValue(postcardJson, PostOnDayRequest.class);
        return PostcardResponse.of(
                postcards.postOnTripDay(
                        member, dayId, request.caption(), PostcardController.bytesOf(devicePhotos)));
    }


    private Membership requireMember(Traveler traveler, UUID tripId) {
        return guard.membershipOf(traveler.id(), tripId).orElseThrow(TripNotFoundException::new);
    }
}
