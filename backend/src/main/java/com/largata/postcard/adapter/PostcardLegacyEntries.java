package com.largata.postcard.adapter;

import com.largata.diary.api.DiaryApi;
import com.largata.diary.api.DiaryDayView;
import com.largata.postcard.legacy.LegacyEntries;
import com.largata.postcard.entity.Postcard;
import com.largata.postcard.exception.ActivityAlreadyPostcardedException;
import com.largata.postcard.exception.PostcardNotFoundException;
import com.largata.postcard.repository.PostcardRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
class PostcardLegacyEntries implements LegacyEntries {

    private final PostcardRepository postcards;
    private final DiaryApi diaries;
    private final Clock clock;

    PostcardLegacyEntries(PostcardRepository postcards, DiaryApi diaries, Clock clock) {
        this.postcards = postcards;
        this.diaries = diaries;
        this.clock = clock;
    }


    @Override
    @Transactional
    public Entry post(
            UUID authorId,
            UUID tripId,
            UUID activityId,
            String activityTitle,
            String dayLabel,
            LocalTime timeOfDay,
            String place,
            UUID tripDayId,
            int tripDayOrdinal,
            String tripDayTitle,
            String tripTitle,
            String tripDestination,
            LocalDate tripStart,
            LocalDate tripEnd,
            String caption) {
        UUID diaryId =
                diaries.mintTripDiary(
                        authorId, tripId, tripTitle, tripDestination, tripStart, tripEnd);
        DiaryDayView day = diaries.mintTripDay(diaryId, tripDayId, tripDayTitle, tripDayOrdinal);
        try {
            return entryOf(
                    postcards.saveAndFlush(
                            Postcard.postedFromActivity(
                                    authorId,
                                    diaryId,
                                    day.id(),
                                    tripId,
                                    activityId,
                                    activityTitle,
                                    dayLabel,
                                    timeOfDay,
                                    place,
                                    null,
                                    null,
                                    null,
                                    caption,
                                    Instant.now(clock))));
        } catch (DataIntegrityViolationException lostTheRace) {
            throw new ActivityAlreadyPostcardedException();
        }
    }


    @Override
    @Transactional(readOnly = true)
    public Optional<Entry> mine(UUID entryId, UUID authorId, UUID tripId) {
        return postcards
                .findByIdAndAuthorId(entryId, authorId)
                .filter(postcard -> tripId.equals(postcard.tripId()))
                .map(PostcardLegacyEntries::entryOf);
    }


    @Override
    @Transactional(readOnly = true)
    public boolean alreadyPosted(UUID authorId, UUID activityId) {
        return postcards.existsByAuthorIdAndActivityId(authorId, activityId);
    }


    @Override
    @Transactional
    public Entry recaption(UUID entryId, String caption) {
        Postcard postcard = postcards.findById(entryId).orElseThrow(PostcardNotFoundException::new);
        postcard.recaption(caption, Instant.now(clock));
        return entryOf(postcards.saveAndFlush(postcard));
    }


    @Override
    @Transactional
    public void delete(UUID entryId) {
        postcards.findById(entryId).ifPresent(postcards::delete);
        postcards.flush();
    }


    @Override
    @Transactional(readOnly = true)
    public List<Entry> pageOfMine(UUID authorId, UUID tripId, UUID after, int limit) {
        List<Postcard> found =
                after == null
                        ? postcards.findByAuthorIdAndTripIdOrderById(authorId, tripId, Limit.of(limit))
                        : postcards.findByAuthorIdAndTripIdAndIdGreaterThanOrderById(
                                authorId, tripId, after, Limit.of(limit));
        return found.stream().map(PostcardLegacyEntries::entryOf).toList();
    }


    @Override
    @Transactional(readOnly = true)
    public List<TripRoll> tripsOf(UUID authorId, List<UUID> onlyTrips, UUID before, int limit) {
        if (onlyTrips.isEmpty()) {
            return List.of();
        }
        List<PostcardRepository.TripRollRow> found =
                before == null
                        ? postcards.rollsOfTrips(authorId, onlyTrips, Limit.of(limit))
                        : postcards.rollsOfTripsBefore(authorId, onlyTrips, before, Limit.of(limit));
        return found.stream().map(PostcardLegacyEntries::rollOf).toList();
    }


    @Override
    @Transactional(readOnly = true)
    public List<TripRoll> tripsOf(UUID authorId, UUID before, int limit) {
        List<PostcardRepository.TripRollRow> found =
                before == null
                        ? postcards.rolls(authorId, Limit.of(limit))
                        : postcards.rollsBefore(authorId, before, Limit.of(limit));
        return found.stream().map(PostcardLegacyEntries::rollOf).toList();
    }


    @Override
    @Transactional(readOnly = true)
    public List<Entry> feedPage(List<UUID> hiddenAuthors, Instant at, UUID id, int limit) {
        List<Postcard> found;
        if (at == null) {
            found =
                    hiddenAuthors.isEmpty()
                            ? postcards.firstFeedPage(Limit.of(limit))
                            : postcards.firstFeedPageExcept(hiddenAuthors, Limit.of(limit));
        } else {
            found =
                    hiddenAuthors.isEmpty()
                            ? postcards.feedPageAfter(at, id, Limit.of(limit))
                            : postcards.feedPageExceptAfter(hiddenAuthors, at, id, Limit.of(limit));
        }
        return found.stream().map(PostcardLegacyEntries::entryOf).toList();
    }


    @Override
    @Transactional(readOnly = true)
    public List<Entry> feedPageOf(List<UUID> authorIds, Instant at, UUID id, int limit) {
        if (authorIds.isEmpty()) {
            return List.of();
        }
        List<Postcard> found =
                at == null
                        ? postcards.firstFeedPageBy(authorIds, Limit.of(limit))
                        : postcards.feedPageByAfter(authorIds, at, id, Limit.of(limit));
        return found.stream().map(PostcardLegacyEntries::entryOf).toList();
    }


    @Override
    @Transactional(readOnly = true)
    public List<Entry> ofTrip(UUID tripId, UUID authorId) {
        return postcards.findByTripIdAndAuthorIdOrderById(tripId, authorId).stream()
                .map(PostcardLegacyEntries::entryOf)
                .toList();
    }


    @Override
    @Transactional(readOnly = true)
    public Optional<Entry> byId(UUID entryId) {
        return postcards.findById(entryId).map(PostcardLegacyEntries::entryOf);
    }


    private static TripRoll rollOf(PostcardRepository.TripRollRow row) {
        return new TripRoll(row.getTripId(), row.getEntryCount(), row.getLatestEntryId());
    }


    private static Entry entryOf(Postcard postcard) {
        return new Entry(
                postcard.id(),
                postcard.authorId(),
                postcard.tripId(),
                postcard.activityId(),
                postcard.activityTitle(),
                postcard.dayLabel(),
                postcard.timeOfDay(),
                postcard.place(),
                postcard.caption(),
                postcard.createdAt(),
                postcard.createdAt(),
                postcard.updatedAt());
    }
}
