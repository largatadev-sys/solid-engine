package com.largata.postcard.web;

import com.largata.postcard.Postcard;
import com.largata.postcard.PostcardView;
import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;


public record PostcardResponse(
        UUID id,
        UUID diaryId,
        UUID tripId,
        UUID activityId,
        String activityTitle,
        String dayLabel,
        LocalTime timeOfDay,
        String place,
        String caption,
        List<PostcardPhotoResponse> photos,
        Instant createdAt,
        Instant updatedAt) {


    public static PostcardResponse of(PostcardView view) {
        Postcard postcard = view.postcard();
        return new PostcardResponse(
                postcard.id(),
                postcard.diaryId(),
                postcard.tripId(),
                postcard.activityId(),
                postcard.activityTitle(),
                postcard.dayLabel(),
                postcard.timeOfDay(),
                postcard.place(),
                postcard.caption(),
                view.photos().stream().map(PostcardPhotoResponse::of).toList(),
                postcard.createdAt(),
                postcard.updatedAt());
    }
}
