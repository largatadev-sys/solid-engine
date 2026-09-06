package com.largata.diary.web;

import com.largata.diary.DiaryService;
import com.largata.diary.DiaryView;
import java.util.List;
import java.util.Map;
import java.util.UUID;


public record DiarySectionsResponse(
        List<DiarySectionResponse> diaries,
        List<DiaryPostcardResponse> loosePostcards,
        int diaryCount) {


    public static DiarySectionsResponse of(
            DiaryService.Sections sections, Map<UUID, UUID> publishedAs) {
        return new DiarySectionsResponse(
                sections.diaries().stream()
                        .map(view -> DiarySectionResponse.of(view, itineraryIdOf(view, publishedAs)))
                        .toList(),
                sections.loosePostcards().stream()
                        .map(card -> DiaryPostcardResponse.of(card, null))
                        .toList(),
                sections.diaryCount());
    }


    private static UUID itineraryIdOf(DiaryView view, Map<UUID, UUID> publishedAs) {
        UUID tripId = view.diary().tripId();
        return tripId == null ? null : publishedAs.get(tripId);
    }
}
