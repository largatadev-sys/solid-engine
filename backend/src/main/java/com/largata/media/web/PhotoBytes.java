package com.largata.media.web;

import com.largata.common.storage.ObjectStore;
import com.largata.media.MediaExceptions.PhotoNotFoundException;
import com.largata.media.Photo;
import com.largata.media.PhotoService;
import com.largata.media.PhotoSubject;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;


@Component
public class PhotoBytes {

    private final PhotoService photos;

    PhotoBytes(PhotoService photos) {
        this.photos = photos;
    }


    public ResponseEntity<InputStreamResource> thumbnailOfItinerary(UUID itineraryId) {
        List<Photo> covers = photos.allOf(PhotoSubject.ITINERARY_COVER, itineraryId);
        if (covers.isEmpty()) {
            throw new PhotoNotFoundException();
        }
        return serve(covers.get(0));
    }


    private ResponseEntity<InputStreamResource> serve(Photo photo) {
        ObjectStore.StoredObject object =
                photos.bytesOf(photo, PhotoService.Variant.THUMBNAIL).orElseThrow(PhotoNotFoundException::new);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(object.contentType()))
                .contentLength(object.byteSize())
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePrivate().immutable())
                .body(new InputStreamResource(object.bytes()));
    }
}
