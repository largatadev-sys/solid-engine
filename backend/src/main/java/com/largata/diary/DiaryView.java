package com.largata.diary;

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
