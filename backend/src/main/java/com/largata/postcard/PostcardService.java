package com.largata.postcard;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.Membership;
import com.largata.common.authz.TripArchivedException;
import com.largata.common.tx.AfterCommit;
import com.largata.diary.Diary;
import com.largata.diary.DiaryService;
import com.largata.media.Photo;
import com.largata.media.PhotoService;
import com.largata.media.PhotoSubject;
import com.largata.postcard.PostcardExceptions.ActivityAlreadyPostcardedException;
import com.largata.postcard.PostcardExceptions.PostcardActivityNotFoundException;
import com.largata.postcard.PostcardExceptions.PostcardNeedsAPhotoException;
import com.largata.postcard.PostcardExceptions.PostcardNotFoundException;
import com.largata.postcard.PostcardExceptions.TooManyPostcardPhotosException;
import com.largata.postcard.PostcardExceptions.TripNotStartedException;
import com.largata.trip.ActivityFacts;
import com.largata.trip.TripExceptions.TripNotFoundException;
import com.largata.trip.TripFacts;
import com.largata.trip.TripService;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class PostcardService {

    public static final int MAX_PHOTOS_PER_POSTCARD = 5;

    private static final Logger log = LoggerFactory.getLogger(PostcardService.class);

    private final PostcardRepository postcards;
    private final DiaryService diaries;
    private final TripService trips;
    private final PhotoService photos;
    private final Analytics analytics;
    private final Clock clock;

    PostcardService(
            PostcardRepository postcards,
            DiaryService diaries,
            TripService trips,
            PhotoService photos,
            Analytics analytics,
            Clock clock) {
        this.postcards = postcards;
        this.diaries = diaries;
        this.trips = trips;
        this.photos = photos;
        this.analytics = analytics;
        this.clock = clock;
    }


    @Transactional
    public PostcardView createStandalone(
            UUID authorId, UUID diaryId, String place, String caption, List<byte[]> devicePhotos) {
        requirePhotoCountWithin(devicePhotos.size());
        if (diaryId != null) {
            diaries.requireOwn(authorId, diaryId);
        }

        Postcard postcard =
                postcards.saveAndFlush(
                        Postcard.standalone(authorId, diaryId, place, caption, Instant.now(clock)));
        List<Photo> stored = storePhotos(postcard, authorId, devicePhotos);

        log.info(
                "Postcard created: id={} authorId={} photos={}",
                postcard.id(),
                authorId,
                stored.size());
        emit(postcard, "postcard_created");
        return PostcardView.of(postcard, stored);
    }


    @Transactional
    public PostcardView postFromActivity(
            Membership member, UUID activityId, String caption, List<byte[]> devicePhotos) {
        TripFacts trip = requireWritableTrip(member);
        if (!trip.lifecycle().hasStarted()) {
            throw new TripNotStartedException();
        }
        requirePhotoCountWithin(devicePhotos.size());
        ActivityFacts activity =
                trips.activityFactsOf(member.itineraryId(), activityId)
                        .orElseThrow(PostcardActivityNotFoundException::new);
        if (postcards.existsByAuthorIdAndActivityId(member.travelerId(), activityId)) {
            throw new ActivityAlreadyPostcardedException();
        }

        Diary diary = diaries.mintTripDiary(member.travelerId(), member.itineraryId(), trip.title());
        Postcard postcard = savePostedFrom(member, diary, activity, caption);
        List<Photo> stored = storePhotos(postcard, member.travelerId(), devicePhotos);

        log.info(
                "Postcard posted from activity: id={} activityId={} photos={}",
                postcard.id(),
                activityId,
                stored.size());
        emit(postcard, "postcard_created");
        return PostcardView.of(postcard, stored);
    }


    private Postcard savePostedFrom(
            Membership member, Diary diary, ActivityFacts activity, String caption) {
        try {
            return postcards.saveAndFlush(
                    Postcard.postedFromActivity(
                            member.travelerId(),
                            diary.id(),
                            member.itineraryId(),
                            activity.activityId(),
                            activity.title(),
                            activity.dayLabel(),
                            activity.timeOfDay(),
                            activity.place(),
                            caption,
                            Instant.now(clock)));
        } catch (DataIntegrityViolationException lostTheRace) {
            throw new ActivityAlreadyPostcardedException();
        }
    }


    private TripFacts requireWritableTrip(Membership member) {
        TripFacts trip = trips.factsOf(member.itineraryId()).orElseThrow(TripNotFoundException::new);
        if (!trip.archived()) {
            return trip;
        }
        if (member.isOwner()) {
            throw new TripArchivedException();
        }
        throw new TripNotFoundException();
    }


    @Transactional(readOnly = true)
    public PostcardView read(UUID postcardId) {
        Postcard postcard =
                postcards.findById(postcardId).orElseThrow(PostcardNotFoundException::new);
        return PostcardView.of(postcard, photos.allOf(PhotoSubject.POSTCARD, postcard.id()));
    }


    @Transactional
    public PostcardView recaption(UUID authorId, UUID postcardId, String caption) {
        Postcard postcard = requireMine(authorId, postcardId);
        if (postcard.tripId() != null && trips.frozen(postcard.tripId())) {
            throw new TripArchivedException();
        }
        postcard.recaption(caption, Instant.now(clock));
        Postcard saved = postcards.saveAndFlush(postcard);
        emit(saved, "postcard_recaptioned");
        return PostcardView.of(saved, photos.allOf(PhotoSubject.POSTCARD, saved.id()));
    }


    @Transactional
    public void delete(UUID authorId, UUID postcardId) {
        destroy(requireMine(authorId, postcardId));
        emitById(authorId, postcardId, "postcard_deleted");
    }


    private void destroy(Postcard postcard) {
        photos.allOf(PhotoSubject.POSTCARD, postcard.id())
                .forEach(photo -> photos.delete(photo.id()));
        postcards.delete(postcard);
        postcards.flush();
        log.info("Postcard deleted: id={}", postcard.id());
    }


    private List<Photo> storePhotos(Postcard postcard, UUID authorId, List<byte[]> devicePhotos) {
        return devicePhotos.stream()
                .map(bytes -> photos.add(PhotoSubject.POSTCARD, postcard.id(), bytes, authorId))
                .toList();
    }


    private void requirePhotoCountWithin(int total) {
        if (total < 1) {
            throw new PostcardNeedsAPhotoException();
        }
        if (total > MAX_PHOTOS_PER_POSTCARD) {
            throw new TooManyPostcardPhotosException(MAX_PHOTOS_PER_POSTCARD);
        }
    }


    private Postcard requireMine(UUID authorId, UUID postcardId) {
        return postcards
                .findByIdAndAuthorId(postcardId, authorId)
                .orElseThrow(PostcardNotFoundException::new);
    }


    private void emit(Postcard postcard, String event) {
        emitById(postcard.authorId(), postcard.id(), event);
    }


    private void emitById(UUID authorId, UUID postcardId, String event) {
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named(event)
                                        .with("postcardId", postcardId)
                                        .with("travelerId", authorId)
                                        .build()));
    }
}
