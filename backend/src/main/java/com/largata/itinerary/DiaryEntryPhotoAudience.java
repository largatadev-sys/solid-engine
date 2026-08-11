package com.largata.itinerary;

import com.largata.media.PhotoAudience;
import com.largata.media.PhotoSubject;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


@Component
class DiaryEntryPhotoAudience implements PhotoAudience {

    private final DiaryEntryRepository entries;

    DiaryEntryPhotoAudience(DiaryEntryRepository entries) {
        this.entries = entries;
    }


    @Override
    public PhotoSubject governs() {
        return PhotoSubject.DIARY_ENTRY;
    }


    @Override
    @Transactional(readOnly = true)
    public boolean mayRead(UUID entryId, UUID travelerId) {
        return entries.findById(entryId)
                .map(entry -> entry.isAuthoredBy(travelerId))
                .orElse(false);
    }
}
