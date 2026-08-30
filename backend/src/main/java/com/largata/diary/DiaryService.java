package com.largata.diary;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.api.Cursor;
import com.largata.common.api.Page;
import com.largata.common.tx.AfterCommit;
import com.largata.diary.DiaryExceptions.DiaryNotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service("com.largata.diary.DiaryService")
public class DiaryService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private static final Logger log = LoggerFactory.getLogger(DiaryService.class);

    private final DiaryRepository diaries;
    private final Analytics analytics;
    private final Clock clock;

    DiaryService(DiaryRepository diaries, Analytics analytics, Clock clock) {
        this.diaries = diaries;
        this.analytics = analytics;
        this.clock = clock;
    }


    @Transactional
    public Diary create(UUID authorId, String title) {
        Diary saved = diaries.saveAndFlush(Diary.standalone(authorId, title, Instant.now(clock)));
        log.info("Diary created: id={} authorId={}", saved.id(), authorId);
        emit(saved, "diary_created");
        return saved;
    }


    @Transactional(readOnly = true)
    public Page<Diary> mine(UUID authorId, String cursor, Integer requestedLimit) {
        int limit = clamp(requestedLimit);
        Limit probe = Limit.of(limit + 1);
        List<Diary> found =
                cursor == null
                        ? diaries.findByAuthorIdOrderById(authorId, probe)
                        : diaries.findByAuthorIdAndIdGreaterThanOrderById(
                                authorId, Cursor.decode(cursor), probe);

        if (found.size() <= limit) {
            return Page.exhausted(found);
        }
        List<Diary> page = found.subList(0, limit);
        return Page.of(page, Cursor.encode(page.getLast().id()));
    }


    @Transactional(readOnly = true)
    public Diary read(UUID diaryId) {
        return diaries.findById(diaryId).orElseThrow(DiaryNotFoundException::new);
    }


    @Transactional
    public Diary retitle(UUID authorId, UUID diaryId, String title) {
        Diary diary = requireOwn(authorId, diaryId);
        diary.retitle(title, Instant.now(clock));
        Diary saved = diaries.saveAndFlush(diary);
        emit(saved, "diary_retitled");
        return saved;
    }


    @Transactional(readOnly = true)
    public Diary requireOwn(UUID authorId, UUID diaryId) {
        return diaries.findByIdAndAuthorId(diaryId, authorId).orElseThrow(DiaryNotFoundException::new);
    }


    private static int clamp(Integer requestedLimit) {
        if (requestedLimit == null || requestedLimit < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requestedLimit, MAX_PAGE_SIZE);
    }


    private void emit(Diary diary, String event) {
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named(event)
                                        .with("diaryId", diary.id())
                                        .with("travelerId", diary.authorId())
                                        .build()));
    }
}
