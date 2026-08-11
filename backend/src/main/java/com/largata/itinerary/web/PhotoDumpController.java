package com.largata.itinerary.web;

import com.largata.common.api.Page;
import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.itinerary.PhotoDumpService;
import com.largata.itinerary.api.PhotoDumpEntryResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;


@RestController
@RequestMapping("/v1/itineraries/{itineraryId}/photo-dump")
class PhotoDumpController {

    private final PhotoDumpService dump;
    private final AuthorizationGuard guard;

    PhotoDumpController(PhotoDumpService dump, AuthorizationGuard guard) {
        this.dump = dump;
        this.guard = guard;
    }


    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    PhotoDumpEntryResponse add(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @RequestPart("photo") MultipartFile photo)
            throws IOException {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return PhotoDumpEntryResponse.of(dump.add(member, photo.getBytes()));
    }


    @GetMapping
    Page<PhotoDumpEntryResponse> list(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return dump.list(member, cursor, limit).map(PhotoDumpEntryResponse::of);
    }


    @DeleteMapping("/{photoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void remove(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID photoId) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        dump.remove(member, photoId);
    }
}
