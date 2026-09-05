package com.largata.diary;

import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Component
class TripDiaryInserter {

    private final DiaryRepository diaries;

    TripDiaryInserter(DiaryRepository diaries) {
        this.diaries = diaries;
    }


    @Transactional(propagation = Propagation.REQUIRES_NEW)
    Diary insert(UUID authorId, UUID tripId, String title, Instant at) {
        return diaries.saveAndFlush(Diary.mintedForTrip(authorId, tripId, title, at));
    }
}
