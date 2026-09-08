package com.largata.postcard.service;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.authz.Membership;
import com.largata.common.authz.TripArchivedException;
import com.largata.common.geo.Pin;
import com.largata.common.tx.AfterCommit;
import com.largata.diary.api.DiaryApi;
import com.largata.diary.api.DiaryDayView;
import com.largata.identity.TravelerService;
import com.largata.media.MediaExceptions.PhotoNotFoundException;
import com.largata.media.Photo;
import com.largata.media.PhotoService;
import com.largata.media.PhotoSubject;
import com.largata.postcard.entity.Postcard;
import com.largata.postcard.exception.ActivityAlreadyPostcardedException;
import com.largata.postcard.exception.PostcardActivityNotFoundException;
import com.largata.postcard.exception.PostcardAlreadyFiledException;
import com.largata.postcard.exception.PostcardDayNotFoundException;
import com.largata.postcard.exception.PostcardNeedsAPhotoException;
import com.largata.postcard.exception.PostcardNotFoundException;
import com.largata.postcard.exception.TooManyPostcardPhotosException;
import com.largata.postcard.exception.TripNotStartedException;
import com.largata.postcard.repository.PostcardRepository;
import com.largata.trip.api.ActivityFacts;
import com.largata.trip.api.TripApi;
import com.largata.trip.api.TripDayFacts;
import com.largata.trip.api.TripFacts;
import com.largata.trip.exception.TripNotFoundException;
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
    private final DiaryApi diaries;
    private final TripApi trips;
    private final PhotoService photos;
    private final TravelerService travelers;
    private final Analytics analytics;
    private final Clock clock;

    PostcardService(
            PostcardRepository postcards,
            DiaryApi diaries,
            TripApi trips,
            PhotoService photos,
            TravelerService travelers,
            Analytics analytics,
            Clock clock) {
        this.postcards = postcards;
        this.diaries = diaries;
        this.trips = trips;
        this.photos = photos;
        this.travelers = travelers;
        this.analytics = analytics;
        this.clock = clock;
    }


    private PostcardView view(Postcard postcard, List<Photo> stored, DiaryDayView day) {
        return PostcardView.of(
                postcard, stored, day, travelers.summaryById(postcard.authorId()).orElse(null));
    }


    @Transactional
    public PostcardView createStandalone(
            UUID authorId,
            UUID diaryId,
            String place,
            Pin pin,
            String caption,
            List<byte[]> devicePhotos) {
        requirePhotoCountWithin(devicePhotos.size());
        if (diaryId != null) {
            diaries.requireOwn(authorId, diaryId);
        }

        Postcard postcard =
                postcards.saveAndFlush(
                        Postcard.standalone(
                                authorId, diaryId, place, pin, caption, Instant.now(clock)));
        List<Photo> stored = storePhotos(postcard, authorId, devicePhotos);

        log.info(
                "Postcard created: id={} authorId={} photos={}",
                postcard.id(),
                authorId,
                stored.size());
        emit(postcard, "postcard_created");
        return view(postcard, stored, null);
    }


    @Transactional
    public PostcardView postOnDay(
            UUID authorId,
            UUID diaryId,
            UUID dayId,
            String place,
            Pin pin,
            String caption,
            List<byte[]> devicePhotos) {
        requirePhotoCountWithin(devicePhotos.size());
        DiaryDayView day = diaries.requireDayIn(authorId, diaryId, dayId);

        Postcard postcard =
                postcards.saveAndFlush(
                        Postcard.onDay(
                                authorId,
                                diaryId,
                                day.id(),
                                null,
                                null,
                                place,
                                pin,
                                caption,
                                Instant.now(clock)));
        List<Photo> stored = storePhotos(postcard, authorId, devicePhotos);

        log.info(
                "Postcard posted on a diary day: id={} dayId={} photos={}",
                postcard.id(),
                day.id(),
                stored.size());
        emit(postcard, "postcard_created");
        return view(postcard, stored, day);
    }


    @Transactional
    public PostcardView postOnTripDay(
            Membership member, UUID tripDayId, String caption, List<byte[]> devicePhotos) {
        TripFacts trip = requireWritableTrip(member);
        if (!trip.lifecycle().hasStarted()) {
            throw new TripNotStartedException();
        }
        requirePhotoCountWithin(devicePhotos.size());
        trips.dayFactsOf(member.itineraryId(), tripDayId)
                .orElseThrow(PostcardDayNotFoundException::new);

        UUID diaryId = mintDiaryOf(member, trip);
        DiaryDayView day = mintDayOf(diaryId, trip, tripDayId);
        Postcard postcard =
                postcards.saveAndFlush(
                        Postcard.onDay(
                                member.travelerId(),
                                diaryId,
                                day.id(),
                                member.itineraryId(),
                                day.tripDayTitle() == null
                                        ? "Day " + day.ordinal()
                                        : "Day " + day.ordinal() + ": " + day.tripDayTitle(),
                                null,
                                null,
                                caption,
                                Instant.now(clock)));
        List<Photo> stored = storePhotos(postcard, member.travelerId(), devicePhotos);

        log.info(
                "Postcard posted on a trip day: id={} tripDayId={} photos={}",
                postcard.id(),
                tripDayId,
                stored.size());
        emit(postcard, "postcard_created");
        return view(postcard, stored, day);
    }


    @Transactional
    public PostcardView file(UUID authorId, UUID postcardId, UUID diaryId, UUID dayId) {
        Postcard postcard = requireMine(authorId, postcardId);
        if (postcard.diaryDayId() != null) {
            throw new PostcardAlreadyFiledException();
        }
        DiaryDayView day = diaries.requireDayIn(authorId, diaryId, dayId);
        postcard.fileOn(diaryId, day.id(), Instant.now(clock));
        Postcard saved = postcards.saveAndFlush(postcard);
        log.info("Postcard filed: id={} dayId={}", saved.id(), day.id());
        emit(saved, "postcard_filed");
        return view(saved, photos.allOf(PhotoSubject.POSTCARD, saved.id()), day);
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

        UUID diaryId = mintDiaryOf(member, trip);
        DiaryDayView day = mintDayOf(diaryId, trip, activity.tripDayId());
        Postcard postcard = savePostedFrom(member, diaryId, day, activity, caption);
        List<Photo> stored = storePhotos(postcard, member.travelerId(), devicePhotos);

        log.info(
                "Postcard posted from activity: id={} activityId={} photos={}",
                postcard.id(),
                activityId,
                stored.size());
        emit(postcard, "postcard_created");
        return view(postcard, stored, null);
    }


    private UUID mintDiaryOf(Membership member, TripFacts trip) {
        return diaries.mintTripDiary(
                member.travelerId(),
                member.itineraryId(),
                trip.title(),
                trip.destination(),
                trip.startDate(),
                trip.endDate());
    }


    private DiaryDayView mintDayOf(UUID diaryId, TripFacts trip, UUID tripDayId) {
        TripDayFacts day =
                trips.dayFactsOf(trip.id(), tripDayId).orElseThrow(PostcardDayNotFoundException::new);
        return diaries.mintTripDay(diaryId, day.dayId(), day.title(), day.ordinal());
    }


    private Postcard savePostedFrom(
            Membership member,
            UUID diaryId,
            DiaryDayView day,
            ActivityFacts activity,
            String caption) {
        try {
            return postcards.saveAndFlush(
                    Postcard.postedFromActivity(
                            member.travelerId(),
                            diaryId,
                            day.id(),
                            member.itineraryId(),
                            activity.activityId(),
                            activity.title(),
                            activity.dayLabel(),
                            activity.timeOfDay(),
                            activity.place(),
                            activity.latitude(),
                            activity.longitude(),
                            activity.zoom(),
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
        return viewOf(postcard);
    }


    private PostcardView viewOf(Postcard postcard) {
        return view(
                postcard,
                photos.allOf(PhotoSubject.POSTCARD, postcard.id()),
                postcard.diaryDayId() == null ? null : diaries.dayOf(postcard.diaryDayId()));
    }


    @Transactional
    public PostcardView addPhotos(UUID authorId, UUID postcardId, List<byte[]> devicePhotos) {
        Postcard postcard = requireMine(authorId, postcardId);
        requireWritable(postcard);
        if (devicePhotos.isEmpty()) {
            throw new PostcardNeedsAPhotoException();
        }
        requirePhotoCountWithin(photos.countOf(PhotoSubject.POSTCARD, postcard.id()) + devicePhotos.size());
        List<Photo> stored = storePhotos(postcard, authorId, devicePhotos);
        log.info("Postcard photos added: id={} photos={}", postcard.id(), stored.size());
        emit(postcard, "postcard_photos_added");
        return viewOf(postcard);
    }


    @Transactional
    public PostcardView removePhoto(UUID authorId, UUID postcardId, UUID photoId) {
        Postcard postcard = requireMine(authorId, postcardId);
        requireWritable(postcard);
        Photo photo =
                photos.find(photoId)
                        .filter(found -> found.subjectKind() == PhotoSubject.POSTCARD)
                        .filter(found -> postcard.id().equals(found.subjectId()))
                        .orElseThrow(PhotoNotFoundException::new);
        if (photos.countOf(PhotoSubject.POSTCARD, postcard.id()) <= 1) {
            throw new PostcardNeedsAPhotoException();
        }
        photos.delete(photo.id());
        log.info("Postcard photo removed: id={} photoId={}", postcard.id(), photoId);
        emit(postcard, "postcard_photo_removed");
        return viewOf(postcard);
    }


    private void requireWritable(Postcard postcard) {
        if (postcard.tripId() != null && trips.frozen(postcard.tripId())) {
            throw new TripArchivedException();
        }
    }


    @Transactional
    public PostcardView recaption(UUID authorId, UUID postcardId, String caption) {
        Postcard postcard = requireMine(authorId, postcardId);
        requireWritable(postcard);
        postcard.recaption(caption, Instant.now(clock));
        Postcard saved = postcards.saveAndFlush(postcard);
        emit(saved, "postcard_recaptioned");
        return viewOf(saved);
    }


    @Transactional
    public PostcardView place(UUID authorId, UUID postcardId, String place, Pin pin) {
        Postcard postcard = requireMine(authorId, postcardId);
        requireWritable(postcard);
        postcard.moveTo(place, pin, Instant.now(clock));
        Postcard saved = postcards.saveAndFlush(postcard);
        emit(saved, "postcard_placed");
        return viewOf(saved);
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
