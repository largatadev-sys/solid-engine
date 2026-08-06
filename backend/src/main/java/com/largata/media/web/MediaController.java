package com.largata.media.web;

import com.largata.common.storage.ObjectStore;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.media.MediaExceptions.PhotoNotFoundException;
import com.largata.media.Photo;
import com.largata.media.PhotoAudience;
import com.largata.media.PhotoService;
import com.largata.media.PhotoSubject;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/media")
class MediaController {

    private final PhotoService photos;
    private final Map<PhotoSubject, PhotoAudience> audiences;

    MediaController(PhotoService photos, List<PhotoAudience> audiences) {
        this.photos = photos;
        this.audiences =
                audiences.stream().collect(Collectors.toMap(PhotoAudience::governs, Function.identity()));
    }


    @GetMapping("/{photoId}")
    ResponseEntity<InputStreamResource> display(
            @CurrentTraveler Traveler traveler, @PathVariable UUID photoId) {
        return serve(traveler, photoId, PhotoService.Variant.DISPLAY);
    }


    @GetMapping("/{photoId}/thumb")
    ResponseEntity<InputStreamResource> thumbnail(
            @CurrentTraveler Traveler traveler, @PathVariable UUID photoId) {
        return serve(traveler, photoId, PhotoService.Variant.THUMBNAIL);
    }


    private ResponseEntity<InputStreamResource> serve(
            Traveler traveler, UUID photoId, PhotoService.Variant variant) {
        Photo photo = photos.find(photoId).orElseThrow(PhotoNotFoundException::new);
        if (!mayRead(photo, traveler.id())) {
            throw new PhotoNotFoundException();
        }

        ObjectStore.StoredObject object =
                photos.bytesOf(photo, variant).orElseThrow(PhotoNotFoundException::new);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(object.contentType()))
                .contentLength(object.byteSize())
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofDays(365)).cachePrivate().immutable())
                .body(new InputStreamResource(object.bytes()));
    }


    private boolean mayRead(Photo photo, UUID travelerId) {
        PhotoAudience audience = audiences.get(photo.subjectKind());
        return audience != null && audience.mayRead(photo.subjectId(), travelerId);
    }
}
