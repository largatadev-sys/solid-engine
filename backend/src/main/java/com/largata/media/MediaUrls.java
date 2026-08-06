package com.largata.media;

import java.util.UUID;


public final class MediaUrls {

    public static final String MEDIA_PATH = "/v1/media/";

    private MediaUrls() {}


    public static String of(Photo photo) {
        return of(photo.id());
    }


    public static String of(UUID photoId) {
        return MEDIA_PATH + photoId;
    }


    public static String thumbnailOf(Photo photo) {
        return of(photo.id()) + "/thumb";
    }
}
