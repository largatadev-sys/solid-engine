package com.largata.postcard;

import com.largata.diary.DiaryDay;
import com.largata.media.Photo;
import java.util.List;


public record PostcardView(Postcard postcard, List<Photo> photos, DiaryDay day) {


    static PostcardView of(Postcard postcard, List<Photo> photos) {
        return new PostcardView(postcard, photos, null);
    }


    static PostcardView of(Postcard postcard, List<Photo> photos, DiaryDay day) {
        return new PostcardView(postcard, photos, day);
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
