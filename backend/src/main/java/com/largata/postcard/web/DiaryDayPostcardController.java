package com.largata.postcard.web;

import com.largata.common.geo.PinPayload;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.postcard.PostcardService;
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
@RequestMapping("/v1/diaries/{diaryId}/days/{dayId}/postcards")
class DiaryDayPostcardController {

    private final PostcardService postcards;
    private final ObjectMapper json;

    DiaryDayPostcardController(PostcardService postcards, ObjectMapper json) {
        this.postcards = postcards;
        this.json = json;
    }


    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    PostcardResponse post(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID diaryId,
            @PathVariable UUID dayId,
            @RequestPart(name = "postcard", required = false) String postcardJson,
            @RequestPart(name = "photos", required = false) List<MultipartFile> devicePhotos)
            throws IOException {
        PostOnDayRequest request =
                postcardJson == null
                        ? new PostOnDayRequest(null, null, null)
                        : json.readValue(postcardJson, PostOnDayRequest.class);
        return PostcardResponse.of(
                postcards.postOnDay(
                        traveler.id(),
                        diaryId,
                        dayId,
                        request.place(),
                        PinPayload.toPin(request.pin()),
                        request.caption(),
                        PostcardController.bytesOf(devicePhotos)));
    }
}
