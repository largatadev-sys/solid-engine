package com.largata.postcard;

import com.largata.media.Photo;
import java.util.List;


public record PostcardView(Postcard postcard, List<Photo> photos) {


    static PostcardView of(Postcard postcard, List<Photo> photos) {
        return new PostcardView(postcard, photos);
    }
}
