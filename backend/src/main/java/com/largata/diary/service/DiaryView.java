package com.largata.diary.service;

import com.largata.diary.api.DiaryContents;
import com.largata.diary.entity.Diary;
import com.largata.diary.entity.DiaryDay;
import com.largata.identity.TravelerSummary;
import com.largata.media.Photo;
import java.time.LocalDate;
import java.util.List;

public record DiaryView(
        Diary diary,
        int postcardCount,
        List<Day> days,
        List<LocalDate> candidateDates,
        Photo cover,
        Photo fallbackCover,
        TravelerSummary author) {


    public record Day(DiaryDay day, int postcardCount, List<DiaryContents.Card> postcards) {}
}
