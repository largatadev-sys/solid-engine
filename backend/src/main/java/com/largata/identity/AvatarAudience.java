package com.largata.identity;

import com.largata.media.PhotoAudience;
import com.largata.media.PhotoSubject;
import java.util.UUID;
import org.springframework.stereotype.Component;


@Component
class AvatarAudience implements PhotoAudience {

    @Override
    public PhotoSubject governs() {
        return PhotoSubject.TRAVELER_AVATAR;
    }


    @Override
    public boolean mayRead(UUID subjectId, UUID travelerId) {
        return everyAuthenticatedTravelerMaySeeAnyAvatar();
    }


    private static boolean everyAuthenticatedTravelerMaySeeAnyAvatar() {
        return true;
    }
}
