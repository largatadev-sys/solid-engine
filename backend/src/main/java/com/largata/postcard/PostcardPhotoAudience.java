package com.largata.postcard;

import com.largata.identity.AuthoredContentAudience;
import com.largata.media.PhotoAudience;
import com.largata.media.PhotoSubject;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


@Component
class PostcardPhotoAudience implements PhotoAudience {

    private final PostcardRepository postcards;
    private final AuthoredContentAudience audience;

    PostcardPhotoAudience(PostcardRepository postcards, AuthoredContentAudience audience) {
        this.postcards = postcards;
        this.audience = audience;
    }


    @Override
    public PhotoSubject governs() {
        return PhotoSubject.POSTCARD;
    }


    @Override
    @Transactional(readOnly = true)
    public boolean mayRead(UUID postcardId, UUID travelerId) {
        if (travelerId == null) {
            return false;
        }
        return postcards.findById(postcardId)
                .map(postcard -> audience.mayRead(travelerId, postcard.authorId()))
                .orElse(false);
    }
}
