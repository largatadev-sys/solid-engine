package com.largata.media.web;

import com.largata.common.storage.ObjectStore;
import com.largata.media.MediaExceptions.PhotoNotFoundException;
import com.largata.media.Photo;
import com.largata.media.PhotoService;
import com.largata.media.PhotoSubject;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;


@Component
public class PhotoBytes {

    private static final Duration A_YEAR = Duration.ofDays(365);

    private final PhotoService photos;

    PhotoBytes(PhotoService photos) {
        this.photos = photos;
    }


    public ResponseEntity<InputStreamResource> thumbnailOfItinerary(UUID itineraryId) {
        return serve(coverOf(itineraryId), CacheControl.maxAge(A_YEAR).cachePrivate().immutable());
    }


    public ResponseEntity<InputStreamResource> anonymousThumbnailOfItinerary(UUID itineraryId) {
        return serve(coverOf(itineraryId), CacheControl.maxAge(A_YEAR).cachePublic().immutable());
    }


    public Optional<byte[]> displayBytesOfItineraryCover(UUID itineraryId) {
        List<Photo> covers = photos.allOf(PhotoSubject.ITINERARY_COVER, itineraryId);
        if (covers.isEmpty()) {
            return Optional.empty();
        }
        return photos.bytesOf(covers.get(0), PhotoService.Variant.DISPLAY).map(PhotoBytes::readFully);
    }


    private Photo coverOf(UUID itineraryId) {
        List<Photo> covers = photos.allOf(PhotoSubject.ITINERARY_COVER, itineraryId);
        if (covers.isEmpty()) {
            throw new PhotoNotFoundException();
        }
        return covers.get(0);
    }


    private static byte[] readFully(ObjectStore.StoredObject object) {
        try (InputStream bytes = object.bytes()) {
            return bytes.readAllBytes();
        } catch (IOException unreadable) {
            throw new UncheckedIOException(unreadable);
        }
    }


    private ResponseEntity<InputStreamResource> serve(Photo photo, CacheControl caching) {
        ObjectStore.StoredObject object =
                photos.bytesOf(photo, PhotoService.Variant.THUMBNAIL).orElseThrow(PhotoNotFoundException::new);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(object.contentType()))
                .contentLength(object.byteSize())
                .cacheControl(caching)
                .body(new InputStreamResource(object.bytes()));
    }
}
