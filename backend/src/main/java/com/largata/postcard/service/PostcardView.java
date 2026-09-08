package com.largata.postcard.service;

import com.largata.diary.api.DiaryDayView;
import com.largata.identity.TravelerSummary;
import com.largata.media.Photo;
import com.largata.postcard.entity.Postcard;
import java.util.List;

public record PostcardView(
        Postcard postcard, List<Photo> photos, DiaryDayView day, TravelerSummary author) {


    static PostcardView of(
            Postcard postcard, List<Photo> photos, DiaryDayView day, TravelerSummary author) {
        return new PostcardView(postcard, photos, day, author);
    }


    public Integer dayOrdinal() {
        return day == null ? null : day.ordinal();
    }


    public String renderedPlace() {
        if (postcard.place() != null) {
            return postcard.place();
        }
        return day == null ? null : day.place();
    }
}
