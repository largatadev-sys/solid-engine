package com.largata.postcard;

import com.largata.media.PhotoAudience;
import com.largata.media.PhotoSubject;
import java.util.UUID;
import org.springframework.stereotype.Component;


@Component
class PostcardPhotoAudience implements PhotoAudience {

    @Override
    public PhotoSubject governs() {
        return PhotoSubject.POSTCARD;
    }


    @Override
    public boolean mayRead(UUID subjectId, UUID travelerId) {
        return travelerId != null;
    }
}
