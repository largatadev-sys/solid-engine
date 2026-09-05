package com.largata.postcard.web;

import com.largata.media.MediaUrls;
import com.largata.media.Photo;
import java.util.UUID;


public record PostcardPhotoResponse(UUID id, String url, String thumbUrl) {


    public static PostcardPhotoResponse of(Photo photo) {
        return new PostcardPhotoResponse(photo.id(), MediaUrls.of(photo), MediaUrls.thumbnailOf(photo));
    }
}
