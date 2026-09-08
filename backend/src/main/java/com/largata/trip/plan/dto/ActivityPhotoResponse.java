package com.largata.trip.plan.dto;

import java.util.List;
import java.util.UUID;
import com.largata.trip.plan.service.ActivityPhotoView;


public record ActivityPhotoResponse(UUID id, String url, String thumbUrl) {

    static ActivityPhotoResponse of(ActivityPhotoView photo) {
        return new ActivityPhotoResponse(photo.id(), photo.url(), photo.thumbUrl());
    }


    public static List<ActivityPhotoResponse> allOf(List<ActivityPhotoView> photos) {
        return photos.stream().map(ActivityPhotoResponse::of).toList();
    }
}
