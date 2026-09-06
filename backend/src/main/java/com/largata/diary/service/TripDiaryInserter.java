package com.largata.diary.service;

import com.largata.diary.entity.Diary;
import com.largata.diary.repository.DiaryRepository;
import java.time.Instant;
import java.time.LocalDate;
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
    Diary insert(
            UUID authorId,
            UUID tripId,
            String title,
            String destination,
            LocalDate startDate,
            LocalDate endDate,
            Instant at) {
        return diaries.saveAndFlush(
                Diary.mintedForTrip(authorId, tripId, title, destination, startDate, endDate, at));
    }
}
