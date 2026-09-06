package com.largata.diary;

import com.largata.identity.AuthoredContentAudience;
import com.largata.media.PhotoAudience;
import com.largata.media.PhotoSubject;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


@Component
class DiaryCoverAudience implements PhotoAudience {

    private final DiaryRepository diaries;
    private final AuthoredContentAudience audience;

    DiaryCoverAudience(DiaryRepository diaries, AuthoredContentAudience audience) {
        this.diaries = diaries;
        this.audience = audience;
    }


    @Override
    public PhotoSubject governs() {
        return PhotoSubject.DIARY_COVER;
    }


    @Override
    @Transactional(readOnly = true)
    public boolean mayRead(UUID diaryId, UUID travelerId) {
        if (travelerId == null) {
            return false;
        }
        return diaries.findById(diaryId)
                .map(diary -> audience.mayRead(travelerId, diary.authorId()))
                .orElse(false);
    }
}
