package com.largata.postcard;

import com.largata.diary.DiaryContents;
import com.largata.media.Photo;
import com.largata.media.PhotoService;
import com.largata.media.PhotoSubject;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


@Component
class PostcardDiaryContents implements DiaryContents {

    private static final Logger log = LoggerFactory.getLogger(PostcardDiaryContents.class);

    private final PostcardRepository postcards;
    private final PhotoService photos;

    PostcardDiaryContents(PostcardRepository postcards, PhotoService photos) {
        this.postcards = postcards;
        this.photos = photos;
    }


    @Override
    @Transactional
    public void destroyAllIn(UUID diaryId) {
        destroy(postcards.findByDiaryId(diaryId));
        log.info("Diary contents destroyed: diaryId={}", diaryId);
    }


    @Override
    @Transactional
    public void destroyAllOn(UUID diaryDayId) {
        destroy(postcards.findByDiaryDayId(diaryDayId));
        log.info("Diary day contents destroyed: diaryDayId={}", diaryDayId);
    }


    private void destroy(List<Postcard> doomed) {
        doomed.forEach(
                postcard -> {
                    photos.allOf(PhotoSubject.POSTCARD, postcard.id())
                            .forEach(photo -> photos.delete(photo.id()));
                    postcards.delete(postcard);
                });
        postcards.flush();
    }


    @Override
    @Transactional(readOnly = true)
    public Map<UUID, Integer> countsByDay(List<UUID> diaryDayIds) {
        if (diaryDayIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, Integer> counts = new HashMap<>();
        postcards
                .countsByDay(diaryDayIds)
                .forEach(row -> counts.put(row.dayId(), Math.toIntExact(row.total())));
        return counts;
    }


    @Override
    @Transactional(readOnly = true)
    public int countIn(UUID diaryId) {
        return postcards.countByDiaryId(diaryId);
    }


    @Override
    @Transactional(readOnly = true)
    public Map<UUID, Integer> countsByDiary(List<UUID> diaryIds) {
        if (diaryIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, Integer> counts = new HashMap<>();
        postcards
                .countsByDiary(diaryIds)
                .forEach(row -> counts.put(row.dayId(), Math.toIntExact(row.total())));
        return counts;
    }


    @Override
    @Transactional(readOnly = true)
    public List<Card> cardsOn(List<UUID> diaryDayIds) {
        if (diaryDayIds.isEmpty()) {
            return List.of();
        }
        return cardsOf(postcards.findByDiaryDayIdInOrderByCreatedAt(diaryDayIds));
    }


    @Override
    @Transactional(readOnly = true)
    public List<Card> looseCardsOf(UUID authorId) {
        return cardsOf(postcards.findByAuthorIdAndDiaryIdIsNullOrderByCreatedAtDesc(authorId));
    }


    private List<Card> cardsOf(List<Postcard> found) {
        if (found.isEmpty()) {
            return List.of();
        }
        Map<UUID, List<Photo>> byPostcard =
                photos.allOfEach(PhotoSubject.POSTCARD, found.stream().map(Postcard::id).toList());
        return found.stream()
                .map(
                        postcard ->
                                new Card(
                                        postcard.id(),
                                        postcard.diaryId(),
                                        postcard.diaryDayId(),
                                        postcard.tripId(),
                                        postcard.activityId(),
                                        postcard.activityTitle(),
                                        postcard.dayLabel(),
                                        postcard.caption(),
                                        postcard.place(),
                                        postcard.pin(),
                                        postcard.createdAt(),
                                        postcard.updatedAt(),
                                        byPostcard.getOrDefault(postcard.id(), List.of())))
                .toList();
    }
}
