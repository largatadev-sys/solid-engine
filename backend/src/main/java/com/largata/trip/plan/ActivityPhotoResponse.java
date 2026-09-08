package com.largata.trip.plan;

import com.largata.trip.plan.ActivityPhotoView;
import java.util.List;
import java.util.UUID;


public record ActivityPhotoResponse(UUID id, String url, String thumbUrl) {

    static ActivityPhotoResponse of(ActivityPhotoView photo) {
        return new ActivityPhotoResponse(photo.id(), photo.url(), photo.thumbUrl());
    }


    public static List<ActivityPhotoResponse> allOf(List<ActivityPhotoView> photos) {
        return photos.stream().map(ActivityPhotoResponse::of).toList();
    }
}
