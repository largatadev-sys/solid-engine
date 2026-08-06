package com.largata.itinerary;

import com.largata.media.MediaUrls;
import com.largata.media.Photo;
import java.util.List;
import java.util.UUID;


public record ActivityPhotoView(UUID id, String url, String thumbUrl) {

    static ActivityPhotoView of(Photo photo) {
        return new ActivityPhotoView(photo.id(), MediaUrls.of(photo), MediaUrls.thumbnailOf(photo));
    }


    static List<ActivityPhotoView> allOf(List<Photo> photos) {
        return photos.stream().map(ActivityPhotoView::of).toList();
    }
}
