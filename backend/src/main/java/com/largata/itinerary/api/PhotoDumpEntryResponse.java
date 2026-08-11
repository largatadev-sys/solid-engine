package com.largata.itinerary.api;

import com.largata.media.MediaUrls;
import com.largata.media.Photo;
import java.time.Instant;
import java.util.UUID;


public record PhotoDumpEntryResponse(
        UUID id, String url, String thumbUrl, UUID uploadedBy, Instant createdAt) {

    public static PhotoDumpEntryResponse of(Photo photo) {
        return new PhotoDumpEntryResponse(
                photo.id(),
                MediaUrls.of(photo),
                MediaUrls.thumbnailOf(photo),
                photo.uploadedBy(),
                photo.createdAt());
    }
}
