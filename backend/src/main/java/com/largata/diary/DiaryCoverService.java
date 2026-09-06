package com.largata.diary;

import com.largata.media.Photo;
import com.largata.media.PhotoService;
import com.largata.media.PhotoSubject;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class DiaryCoverService {

    private static final Logger log = LoggerFactory.getLogger(DiaryCoverService.class);

    private final PhotoService photos;

    DiaryCoverService(PhotoService photos) {
        this.photos = photos;
    }


    @Transactional(readOnly = true)
    Optional<Photo> coverOf(UUID diaryId) {
        List<Photo> stored = photos.allOf(PhotoSubject.DIARY_COVER, diaryId);
        return stored.isEmpty() ? Optional.empty() : Optional.of(stored.getFirst());
    }


    @Transactional
    public Photo replace(UUID diaryId, byte[] uploaded, UUID uploadedBy) {
        Photo cover = photos.replaceSingle(PhotoSubject.DIARY_COVER, diaryId, uploaded, uploadedBy);
        log.info("Diary cover set: diaryId={} photoId={}", diaryId, cover.id());
        return cover;
    }


    @Transactional
    public void remove(UUID diaryId) {
        photos.deleteSingle(PhotoSubject.DIARY_COVER, diaryId);
        log.info("Diary cover removed: diaryId={}", diaryId);
    }
}
