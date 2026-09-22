package com.largata.postcard.controller;

import static com.largata.trip.room.Door.Rule.OPEN;

import com.largata.trip.room.CurrentMember;
import com.largata.trip.room.Door;
import com.largata.trip.room.Membership;
import com.largata.postcard.dto.PostFromActivityRequest;
import com.largata.postcard.dto.PostcardResponse;
import com.largata.postcard.service.PostcardService;
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
@RequestMapping("/v1/trips/{tripId}/activities/{activityId}/postcards")
class TripPostcardController {

    private final PostcardService postcards;
    private final ObjectMapper json;

    TripPostcardController(PostcardService postcards, ObjectMapper json) {
        this.postcards = postcards;
        this.json = json;
    }


    @PostMapping
    @Door(OPEN)
    @ResponseStatus(HttpStatus.CREATED)
    PostcardResponse post(
            @CurrentMember Membership member,
            @PathVariable UUID activityId,
            @RequestPart(name = "postcard", required = false) String postcardJson,
            @RequestPart(name = "photos", required = false) List<MultipartFile> devicePhotos)
            throws IOException {
        PostFromActivityRequest request =
                postcardJson == null
                        ? new PostFromActivityRequest(null)
                        : json.readValue(postcardJson, PostFromActivityRequest.class);
        return PostcardResponse.of(
                postcards.postFromActivity(
                        member, activityId, request.caption(), PostcardController.bytesOf(devicePhotos)));
    }
}
