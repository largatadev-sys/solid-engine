package com.largata.trip.dump;

import static com.largata.trip.room.Door.Rule.OPEN;

import com.largata.common.api.Page;
import com.largata.trip.room.CurrentMember;
import com.largata.trip.room.Door;
import com.largata.trip.room.Membership;
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
@RequestMapping("/v1/trips/{itineraryId}/photo-dump")
class PhotoDumpController {

    private final PhotoDumpService dump;

    PhotoDumpController(PhotoDumpService dump) {
        this.dump = dump;
    }


    @PostMapping
    @Door(OPEN)
    @ResponseStatus(HttpStatus.CREATED)
    PhotoDumpEntryResponse add(@CurrentMember Membership member, @RequestPart("photo") MultipartFile photo)
            throws IOException {
        return PhotoDumpEntryResponse.of(dump.add(member, photo.getBytes()));
    }


    @GetMapping
    Page<PhotoDumpEntryResponse> list(
            @CurrentMember Membership member,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return dump.list(member, cursor, limit).map(PhotoDumpEntryResponse::of);
    }


    @DeleteMapping("/{photoId}")
    @Door(OPEN)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void remove(@CurrentMember Membership member, @PathVariable UUID photoId) {
        dump.remove(member, photoId);
    }
}
