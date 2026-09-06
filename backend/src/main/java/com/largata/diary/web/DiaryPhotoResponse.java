package com.largata.diary.web;

import com.largata.media.MediaUrls;
import com.largata.media.Photo;
import java.util.UUID;


public record DiaryPhotoResponse(UUID id, String url, String thumbUrl) {


    public static DiaryPhotoResponse of(Photo photo) {
        return photo == null
                ? null
                : new DiaryPhotoResponse(
                        photo.id(), MediaUrls.of(photo), MediaUrls.thumbnailOf(photo));
    }
}
