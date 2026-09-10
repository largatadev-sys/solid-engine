package com.largata.feed.api;

import com.largata.media.MediaUrls;
import com.largata.media.Photo;
import java.util.UUID;


public record FeedPhotoResponse(UUID id, String url, String thumbUrl) {

    public static FeedPhotoResponse of(Photo photo) {
        return new FeedPhotoResponse(photo.id(), MediaUrls.of(photo), MediaUrls.thumbnailOf(photo));
    }
}
