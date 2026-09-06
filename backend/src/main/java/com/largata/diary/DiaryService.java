package com.largata.diary;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.api.Cursor;
import com.largata.common.api.Page;
import com.largata.common.tx.AfterCommit;
import com.largata.diary.DiaryExceptions.DiaryDayAlreadyExistsException;
import com.largata.diary.DiaryExceptions.DiaryDayNeedsADateException;
import com.largata.diary.DiaryExceptions.DiaryDayNotFoundException;
import com.largata.diary.DiaryExceptions.DiaryNotFoundException;
import com.largata.identity.TravelerService;
import com.largata.identity.TravelerSummary;
import com.largata.media.Photo;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service("com.largata.diary.DiaryService")
public class DiaryService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private static final Logger log = LoggerFactory.getLogger(DiaryService.class);

    private final DiaryRepository diaries;
    private final DiaryDayRepository days;
    private final DiaryContents contents;
    private final DiaryCoverService covers;
    private final TripDiaryInserter tripDiaries;
    private final DiaryDayInserter dayInserter;
    private final TravelerService travelers;
    private final Analytics analytics;
    private final Clock clock;

    DiaryService(
            DiaryRepository diaries,
            DiaryDayRepository days,
            DiaryContents contents,
            DiaryCoverService covers,
            TripDiaryInserter tripDiaries,
            DiaryDayInserter dayInserter,
            TravelerService travelers,
            Analytics analytics,
            Clock clock) {
        this.diaries = diaries;
        this.days = days;
        this.contents = contents;
        this.covers = covers;
        this.tripDiaries = tripDiaries;
        this.dayInserter = dayInserter;
        this.travelers = travelers;
        this.analytics = analytics;
        this.clock = clock;
    }


    private TravelerSummary authorOf(Diary diary) {
        return travelers.summaryById(diary.authorId()).orElse(null);
    }


    @Transactional
    public DiaryView create(
            UUID authorId, String title, String destination, LocalDate startDate, LocalDate endDate) {
        Diary saved =
                diaries.saveAndFlush(
                        Diary.standalone(
                                authorId, title, destination, startDate, endDate, Instant.now(clock)));
        log.info("Diary created: id={} authorId={}", saved.id(), authorId);
        emit(saved, "diary_created");
        return new DiaryView(
                saved, 0, List.of(), saved.candidateDates(), null, null, authorOf(saved));
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
    public List<DiaryView> allOf(UUID authorId) {
        List<Diary> found = diaries.findByAuthorIdOrderByUpdatedAtDesc(authorId);
        if (found.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = found.stream().map(Diary::id).toList();
        Map<UUID, Integer> countsByDiary = contents.countsByDiary(ids);
        List<DiaryDay> allDays = days.findByDiaryIdInOrderByOrdinal(ids);
        List<DiaryContents.Card> cards =
                contents.cardsOn(allDays.stream().map(DiaryDay::id).toList());
        return found.stream()
                .map(
                        diary -> {
                            List<DiaryView.Day> daysOfIt =
                                    allDays.stream()
                                            .filter(day -> day.diaryId().equals(diary.id()))
                                            .map(
                                                    day -> {
                                                        List<DiaryContents.Card> onDay =
                                                                cards.stream()
                                                                        .filter(
                                                                                card ->
                                                                                        day.id()
                                                                                                .equals(
                                                                                                        card
                                                                                                                .diaryDayId()))
                                                                        .toList();
                                                        return new DiaryView.Day(
                                                                day, onDay.size(), onDay);
                                                    })
                                            .toList();
                            Photo cover = covers.coverOf(diary.id()).orElse(null);
                            return new DiaryView(
                                    diary,
                                    countsByDiary.getOrDefault(diary.id(), 0),
                                    daysOfIt,
                                    candidatesAmong(
                                            diary,
                                            daysOfIt.stream().map(DiaryView.Day::day).toList()),
                                    cover,
                                    cover == null
                                            ? firstPhotoAmong(
                                                    daysOfIt.stream()
                                                            .flatMap(day -> day.postcards().stream())
                                                            .toList())
                                            : null,
                                    authorOf(diary));
                        })
                .toList();
    }


    @Transactional(readOnly = true)
    public Diary read(UUID diaryId) {
        return diaries.findById(diaryId).orElseThrow(DiaryNotFoundException::new);
    }


    @Transactional(readOnly = true)
    public DiaryView readWithDays(UUID diaryId) {
        return viewOf(read(diaryId));
    }


    private DiaryView viewOf(Diary diary) {
        List<DiaryDay> stored = days.findByDiaryIdOrderByOrdinal(diary.id());
        List<UUID> dayIds = stored.stream().map(DiaryDay::id).toList();
        List<DiaryContents.Card> cards = contents.cardsOn(dayIds);
        Photo cover = covers.coverOf(diary.id()).orElse(null);
        return new DiaryView(
                diary,
                contents.countIn(diary.id()),
                stored.stream()
                        .map(
                                day -> {
                                    List<DiaryContents.Card> onDay =
                                            cards.stream()
                                                    .filter(card -> day.id().equals(card.diaryDayId()))
                                                    .toList();
                                    return new DiaryView.Day(day, onDay.size(), onDay);
                                })
                        .toList(),
                candidatesAmong(diary, stored),
                cover,
                cover == null ? firstPhotoAmong(cards) : null,
                authorOf(diary));
    }


    private static List<LocalDate> candidatesAmong(Diary diary, List<DiaryDay> stored) {
        Set<LocalDate> taken = stored.stream().map(DiaryDay::date).collect(Collectors.toSet());
        return diary.candidateDates().stream().filter(date -> !taken.contains(date)).toList();
    }


    private static Photo firstPhotoAmong(List<DiaryContents.Card> cards) {
        return cards.stream()
                .flatMap(card -> card.photos().stream())
                .findFirst()
                .orElse(null);
    }


    @Transactional
    public DiaryView describe(
            UUID authorId,
            UUID diaryId,
            String title,
            String destination,
            LocalDate startDate,
            LocalDate endDate) {
        Diary diary = requireOwn(authorId, diaryId);
        diary.describe(title, destination, startDate, endDate, Instant.now(clock));
        Diary saved = diaries.saveAndFlush(diary);
        emit(saved, "diary_described");
        return viewOf(saved);
    }


    @Transactional
    public Diary mintTripDiary(
            UUID authorId,
            UUID tripId,
            String title,
            String destination,
            LocalDate startDate,
            LocalDate endDate) {
        return diaries.findByAuthorIdAndTripId(authorId, tripId)
                .orElseGet(() -> mint(authorId, tripId, title, destination, startDate, endDate));
    }


    private Diary mint(
            UUID authorId,
            UUID tripId,
            String title,
            String destination,
            LocalDate startDate,
            LocalDate endDate) {
        try {
            Diary minted =
                    tripDiaries.insert(
                            authorId,
                            tripId,
                            title,
                            destination,
                            startDate,
                            endDate,
                            Instant.now(clock));
            log.info("Trip diary minted: id={} authorId={}", minted.id(), authorId);
            emit(minted, "diary_created");
            return minted;
        } catch (DataIntegrityViolationException lostTheRace) {
            return diaries.findByAuthorIdAndTripId(authorId, tripId)
                    .orElseThrow(DiaryNotFoundException::new);
        }
    }


    @Transactional
    public void delete(UUID authorId, UUID diaryId) {
        Diary diary = requireOwn(authorId, diaryId);
        contents.destroyAllIn(diary.id());
        covers.remove(diary.id());
        days.deleteAll(days.findByDiaryIdOrderByOrdinal(diary.id()));
        days.flush();
        diaries.delete(diary);
        diaries.flush();
        log.info("Diary deleted: id={} authorId={}", diaryId, authorId);
        emit(diary, "diary_deleted");
    }


    @Transactional
    public DiaryView setCover(UUID authorId, UUID diaryId, byte[] uploaded) {
        Diary diary = requireOwn(authorId, diaryId);
        covers.replace(diary.id(), uploaded, authorId);
        diary.touch(Instant.now(clock));
        return viewOf(diaries.saveAndFlush(diary));
    }


    @Transactional
    public DiaryView removeCover(UUID authorId, UUID diaryId) {
        Diary diary = requireOwn(authorId, diaryId);
        covers.remove(diary.id());
        diary.touch(Instant.now(clock));
        return viewOf(diaries.saveAndFlush(diary));
    }


    @Transactional(readOnly = true)
    public Sections sectionsOf(UUID authorId) {
        return new Sections(allOf(authorId), contents.looseCardsOf(authorId), countOwnedBy(authorId));
    }


    public record Sections(
            List<DiaryView> diaries, List<DiaryContents.Card> loosePostcards, int diaryCount) {}


    @Transactional
    public DiaryView.Day addDay(UUID authorId, UUID diaryId, LocalDate date, String place) {
        Diary diary = requireOwn(authorId, diaryId);
        if (date == null) {
            throw new DiaryDayNeedsADateException();
        }
        if (days.findByDiaryIdAndDate(diaryId, date).isPresent()) {
            throw new DiaryDayAlreadyExistsException();
        }
        Instant at = Instant.now(clock);
        diary.widenTo(date, at);
        diaries.saveAndFlush(diary);
        try {
            return new DiaryView.Day(
                    dayInserter.insert(diary.id(), diary.ordinalOf(date), date, place, at),
                    0,
                    List.of());
        } catch (DataIntegrityViolationException lostTheRace) {
            throw new DiaryDayAlreadyExistsException();
        }
    }


    DiaryDay materialize(Diary diary, LocalDate date, String place, Instant at) {
        return days.findByDiaryIdAndDate(diary.id(), date)
                .orElseGet(
                        () -> {
                            try {
                                return dayInserter.insert(
                                        diary.id(), diary.ordinalOf(date), date, place, at);
                            } catch (DataIntegrityViolationException lostTheRace) {
                                return days.findByDiaryIdAndDate(diary.id(), date)
                                        .orElseThrow(DiaryDayAlreadyExistsException::new);
                            }
                        });
    }


    @Transactional
    public DiaryDay mintTripDay(UUID diaryId, UUID tripDayId, String tripDayTitle, int ordinal) {
        Instant at = Instant.now(clock);
        return days.findByDiaryIdAndTripDayId(diaryId, tripDayId)
                .orElseGet(
                        () -> {
                            Diary diary =
                                    diaries.findById(diaryId).orElseThrow(DiaryNotFoundException::new);
                            diary.coverDay(ordinal, at);
                            diaries.saveAndFlush(diary);
                            LocalDate date = diary.startDate().plusDays(ordinal - 1L);
                            try {
                                return dayInserter.insertSnapshot(
                                        diaryId, ordinal, date, null, tripDayId, tripDayTitle, at);
                            } catch (DataIntegrityViolationException lostTheRace) {
                                return days.findByDiaryIdAndTripDayId(diaryId, tripDayId)
                                        .orElseThrow(DiaryDayNotFoundException::new);
                            }
                        });
    }


    @Transactional
    public DiaryView.Day placeDay(UUID authorId, UUID diaryId, UUID dayId, String place) {
        requireOwn(authorId, diaryId);
        DiaryDay day =
                days.findByIdAndDiaryId(dayId, diaryId).orElseThrow(DiaryDayNotFoundException::new);
        day.moveTo(place, Instant.now(clock));
        DiaryDay saved = days.saveAndFlush(day);
        List<DiaryContents.Card> onDay = contents.cardsOn(List.of(saved.id()));
        return new DiaryView.Day(saved, onDay.size(), onDay);
    }


    @Transactional
    public void deleteDay(UUID authorId, UUID diaryId, UUID dayId) {
        requireOwn(authorId, diaryId);
        DiaryDay day =
                days.findByIdAndDiaryId(dayId, diaryId).orElseThrow(DiaryDayNotFoundException::new);
        contents.destroyAllOn(day.id());
        days.delete(day);
        days.flush();
        log.info("Diary day deleted: id={} diaryId={}", dayId, diaryId);
    }


    @Transactional(readOnly = true)
    public DiaryDay requireDayIn(UUID authorId, UUID diaryId, UUID dayId) {
        requireOwn(authorId, diaryId);
        return days.findByIdAndDiaryId(dayId, diaryId).orElseThrow(DiaryDayNotFoundException::new);
    }


    @Transactional(readOnly = true)
    public Diary requireOwn(UUID authorId, UUID diaryId) {
        return diaries.findByIdAndAuthorId(diaryId, authorId).orElseThrow(DiaryNotFoundException::new);
    }


    @Transactional(readOnly = true)
    public DiaryDay dayOf(UUID dayId) {
        return days.findById(dayId).orElseThrow(DiaryDayNotFoundException::new);
    }


    @Transactional(readOnly = true)
    public int countOwnedBy(UUID authorId) {
        return diaries.countByAuthorId(authorId);
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
