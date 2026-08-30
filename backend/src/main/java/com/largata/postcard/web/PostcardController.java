package com.largata.postcard.web;

import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.postcard.PostcardService;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;


@RestController
@RequestMapping("/v1/postcards")
class PostcardController {

    private final PostcardService postcards;
    private final ObjectMapper json;

    PostcardController(PostcardService postcards, ObjectMapper json) {
        this.postcards = postcards;
        this.json = json;
    }


    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    PostcardResponse create(
            @CurrentTraveler Traveler traveler,
            @RequestPart(name = "postcard", required = false) String postcardJson,
            @RequestPart(name = "photos", required = false) List<MultipartFile> devicePhotos)
            throws IOException {
        CreatePostcardRequest request =
                postcardJson == null
                        ? new CreatePostcardRequest(null, null, null)
                        : json.readValue(postcardJson, CreatePostcardRequest.class);
        return PostcardResponse.of(
                postcards.createStandalone(
                        traveler.id(),
                        request.diaryId(),
                        request.place(),
                        request.caption(),
                        bytesOf(devicePhotos)));
    }


    @GetMapping("/{postcardId}")
    PostcardResponse read(@CurrentTraveler Traveler traveler, @PathVariable UUID postcardId) {
        return PostcardResponse.of(postcards.read(postcardId));
    }


    @PatchMapping("/{postcardId}")
    PostcardResponse recaption(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID postcardId,
            @RequestBody RecaptionPostcardRequest request) {
        return PostcardResponse.of(postcards.recaption(traveler.id(), postcardId, request.caption()));
    }


    @DeleteMapping("/{postcardId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@CurrentTraveler Traveler traveler, @PathVariable UUID postcardId) {
        postcards.delete(traveler.id(), postcardId);
    }


    static List<byte[]> bytesOf(List<MultipartFile> photos) throws IOException {
        if (photos == null) {
            return List.of();
        }
        List<byte[]> bytes = new ArrayList<>();
        for (MultipartFile photo : photos) {
            bytes.add(photo.getBytes());
        }
        return bytes;
    }
}
