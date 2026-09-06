package com.largata.diary;

import com.largata.common.geo.Pin;
import com.largata.media.Photo;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;


public interface DiaryContents {

    void destroyAllIn(UUID diaryId);

    void destroyAllOn(UUID diaryDayId);

    Map<UUID, Integer> countsByDay(List<UUID> diaryDayIds);

    int countIn(UUID diaryId);

    Map<UUID, Integer> countsByDiary(List<UUID> diaryIds);

    List<Card> cardsOn(List<UUID> diaryDayIds);

    List<Card> looseCardsOf(UUID authorId);


    record Card(
            UUID id,
            UUID diaryId,
            UUID diaryDayId,
            UUID tripId,
            UUID activityId,
            String activityTitle,
            String dayLabel,
            String caption,
            String place,
            Pin pin,
            Instant createdAt,
            Instant updatedAt,
            List<Photo> photos) {}
}
