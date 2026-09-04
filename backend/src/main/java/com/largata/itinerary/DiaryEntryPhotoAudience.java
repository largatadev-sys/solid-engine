package com.largata.itinerary;

import com.largata.identity.AuthoredContentAudience;
import com.largata.media.PhotoAudience;
import com.largata.media.PhotoSubject;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


@Component
class DiaryEntryPhotoAudience implements PhotoAudience {

    private final DiaryEntryRepository entries;
    private final AuthoredContentAudience audience;

    DiaryEntryPhotoAudience(DiaryEntryRepository entries, AuthoredContentAudience audience) {
        this.entries = entries;
        this.audience = audience;
    }


    @Override
    public PhotoSubject governs() {
        return PhotoSubject.DIARY_ENTRY;
    }


    @Override
    @Transactional(readOnly = true)
    public boolean mayRead(UUID entryId, UUID travelerId) {
        return entries.findById(entryId).map(entry -> mayRead(entry, travelerId)).orElse(false);
    }


    private boolean mayRead(DiaryEntry entry, UUID travelerId) {
        if (entry.isAuthoredBy(travelerId)) {
            return true;
        }
        return entry.isShared() && audience.mayRead(travelerId, entry.travelerId());
    }
}
