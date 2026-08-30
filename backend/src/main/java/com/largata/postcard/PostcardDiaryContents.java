package com.largata.postcard;

import com.largata.diary.DiaryContents;
import com.largata.media.PhotoService;
import com.largata.media.PhotoSubject;
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
        postcards.findByDiaryId(diaryId)
                .forEach(
                        postcard -> {
                            photos.allOf(PhotoSubject.POSTCARD, postcard.id())
                                    .forEach(photo -> photos.delete(photo.id()));
                            postcards.delete(postcard);
                        });
        postcards.flush();
        log.info("Diary contents destroyed: diaryId={}", diaryId);
    }
}
