package com.largata.itinerary;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.api.Cursor;
import com.largata.common.api.Page;
import com.largata.common.authz.Membership;
import com.largata.common.authz.WriteFence;
import com.largata.common.tx.AfterCommit;
import com.largata.itinerary.api.DiaryEntryResponse;
import com.largata.itinerary.api.DiaryPhotoResponse;
import com.largata.itinerary.api.DiaryTripResponse;
import com.largata.itinerary.DiaryExceptions.ActivityAlreadyInDiaryException;
import com.largata.itinerary.DiaryExceptions.DiaryEntryNeedsAPhotoException;
import com.largata.itinerary.DiaryExceptions.DiaryEntryNotFoundException;
import com.largata.itinerary.DiaryExceptions.TooManyDiaryPhotosException;
import com.largata.itinerary.DiaryExceptions.TripNotStartedException;
import com.largata.media.MediaExceptions.PhotoNotFoundException;
import com.largata.media.Photo;
import com.largata.media.PhotoService;
import com.largata.media.PhotoSubject;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class DiaryService {

    public static final int MAX_PHOTOS_PER_ENTRY = 5;

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private static final Logger log = LoggerFactory.getLogger(DiaryService.class);

    private final DiaryEntryRepository entries;
    private final ActivityRepository activities;
    private final DayRepository days;
    private final ItineraryRepository itineraries;
    private final PhotoService photos;
    private final WriteFence writeFence;
    private final Analytics analytics;
    private final Clock clock;

    DiaryService(
            DiaryEntryRepository entries,
            ActivityRepository activities,
            DayRepository days,
            ItineraryRepository itineraries,
            PhotoService photos,
            WriteFence writeFence,
            Analytics analytics,
            Clock clock) {
        this.entries = entries;
        this.activities = activities;
        this.days = days;
        this.itineraries = itineraries;
        this.photos = photos;
        this.writeFence = writeFence;
        this.analytics = analytics;
        this.clock = clock;
    }


    @Transactional
    public DiaryEntryResponse post(
            Membership member,
            UUID activityId,
            String caption,
            List<UUID> fromDump,
            List<byte[]> devicePhotos) {
        writeFence.requireWritable(member);
        requireStarted(member);

        int total = fromDump.size() + devicePhotos.size();
        if (total < 1) {
            throw new DiaryEntryNeedsAPhotoException();
        }
        if (total > MAX_PHOTOS_PER_ENTRY) {
            throw new TooManyDiaryPhotosException(MAX_PHOTOS_PER_ENTRY);
        }

        Activity activity = requireActivityOfTrip(member, activityId);
        Day day = days.findById(activity.dayId()).orElseThrow(ActivityNotFoundException::new);
        List<Photo> sources = fromDump.stream().map(id -> requireDumpPhotoOfTrip(member, id)).toList();

        if (entries.existsByTravelerIdAndActivityId(member.travelerId(), activityId)) {
            throw new ActivityAlreadyInDiaryException();
        }

        DiaryEntry entry = saveTheFirstPostFor(member, activityId, activity, day, caption);

        List<Photo> stored = new ArrayList<>();
        sources.forEach(
                source ->
                        stored.add(
                                photos.copyTo(
                                        source, PhotoSubject.DIARY_ENTRY, entry.id(), member.travelerId())));
        devicePhotos.forEach(
                bytes ->
                        stored.add(
                                photos.add(
                                        PhotoSubject.DIARY_ENTRY, entry.id(), bytes, member.travelerId())));

        log.info(
                "Diary entry posted: entryId={} activityId={} photos={}",
                entry.id(),
                activityId,
                total);
        emit(member, "diary_entry_created", entry.id());
        return viewOf(entry, stored);
    }


    @Transactional
    public DiaryEntryResponse recaption(Membership member, UUID entryId, String caption) {
        writeFence.requireWritable(member);
        DiaryEntry entry = requireMyEntry(member, entryId);
        entry.recaption(caption, Instant.now(clock));
        DiaryEntry saved = entries.saveAndFlush(entry);
        emit(member, "diary_entry_edited", entryId);
        return viewOf(saved);
    }


    @Transactional
    public DiaryEntryResponse addDevicePhoto(Membership member, UUID entryId, byte[] uploaded) {
        DiaryEntry entry = requireRoomForAPhoto(member, entryId);
        photos.add(PhotoSubject.DIARY_ENTRY, entry.id(), uploaded, member.travelerId());
        emit(member, "diary_entry_edited", entryId);
        return viewOf(entry);
    }


    @Transactional
    public DiaryEntryResponse addPhotoFromDump(Membership member, UUID entryId, UUID dumpPhotoId) {
        DiaryEntry entry = requireRoomForAPhoto(member, entryId);
        photos.copyTo(
                requireDumpPhotoOfTrip(member, dumpPhotoId),
                PhotoSubject.DIARY_ENTRY,
                entry.id(),
                member.travelerId());
        emit(member, "diary_entry_edited", entryId);
        return viewOf(entry);
    }


    @Transactional
    public DiaryEntryResponse removePhoto(Membership member, UUID entryId, UUID photoId) {
        writeFence.requireWritable(member);
        DiaryEntry entry = requireMyEntry(member, entryId);

        Photo photo =
                photos.find(photoId)
                        .filter(candidate -> candidate.subjectKind() == PhotoSubject.DIARY_ENTRY)
                        .filter(candidate -> candidate.subjectId().equals(entry.id()))
                        .orElseThrow(PhotoNotFoundException::new);

        if (photos.countOf(PhotoSubject.DIARY_ENTRY, entry.id()) <= 1) {
            throw new DiaryEntryNeedsAPhotoException();
        }

        photos.delete(photo.id());
        emit(member, "diary_entry_edited", entryId);
        return viewOf(entry);
    }


    @Transactional
    public void delete(Membership member, UUID entryId) {
        writeFence.requireWritable(member);
        DiaryEntry entry = requireMyEntry(member, entryId);

        photos.allOf(PhotoSubject.DIARY_ENTRY, entry.id())
                .forEach(photo -> photos.delete(photo.id()));
        entries.delete(entry);
        entries.flush();

        log.info("Diary entry deleted: entryId={}", entryId);
        emit(member, "diary_entry_deleted", entryId);
    }


    @Transactional(readOnly = true)
    public List<DiaryEntryResponse> mine(Membership member) {
        return withPhotos(
                entries.findByTravelerIdAndItineraryIdOrderById(
                        member.travelerId(), member.itineraryId()));
    }


    @Transactional(readOnly = true)
    public DiaryEntryResponse mineById(Membership member, UUID entryId) {
        return viewOf(requireMyEntry(member, entryId));
    }


    @Transactional(readOnly = true)
    public Page<DiaryTripResponse> myTrips(UUID travelerId, String cursor, Integer requestedLimit) {
        int limit = clamp(requestedLimit);
        Limit probe = Limit.of(limit + 1);
        List<DiaryEntryRepository.DiaryTripRow> found =
                cursor == null
                        ? entries.findTripsWithEntries(travelerId, probe)
                        : entries.findTripsWithEntriesBefore(travelerId, Cursor.decode(cursor), probe);

        boolean more = found.size() > limit;
        List<DiaryEntryRepository.DiaryTripRow> rows = more ? found.subList(0, limit) : found;
        List<DiaryTripResponse> page = rows.stream().map(this::tripViewOf).toList();

        return more ? Page.of(page, Cursor.encode(rows.getLast().getLatestEntryId())) : Page.exhausted(page);
    }


    private DiaryTripResponse tripViewOf(DiaryEntryRepository.DiaryTripRow row) {
        String title =
                itineraries.findById(row.getItineraryId()).map(Itinerary::title).orElse(null);
        return new DiaryTripResponse(row.getItineraryId(), title, row.getEntryCount());
    }


    private DiaryEntryResponse viewOf(DiaryEntry entry) {
        return viewOf(entry, photos.allOf(PhotoSubject.DIARY_ENTRY, entry.id()));
    }


    private List<DiaryEntryResponse> withPhotos(List<DiaryEntry> ofEntries) {
        Map<UUID, List<Photo>> byEntry =
                photos.allOfEach(
                        PhotoSubject.DIARY_ENTRY, ofEntries.stream().map(DiaryEntry::id).toList());
        return ofEntries.stream()
                .map(entry -> viewOf(entry, byEntry.getOrDefault(entry.id(), List.of())))
                .toList();
    }


    static DiaryEntryResponse viewOf(DiaryEntry entry, List<Photo> entryPhotos) {
        return new DiaryEntryResponse(
                entry.id(),
                entry.itineraryId(),
                entry.activityId(),
                entry.activityTitle(),
                entry.dayLabel(),
                entry.timeOfDay(),
                entry.caption(),
                entryPhotos.stream().map(DiaryPhotoResponse::of).toList(),
                entry.createdAt(),
                entry.updatedAt());
    }


    private static int clamp(Integer requestedLimit) {
        if (requestedLimit == null || requestedLimit < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requestedLimit, MAX_PAGE_SIZE);
    }


    private DiaryEntry saveTheFirstPostFor(
            Membership member, UUID activityId, Activity activity, Day day, String caption) {
        try {
            return entries.saveAndFlush(
                    DiaryEntry.postedFrom(
                            member.travelerId(),
                            member.itineraryId(),
                            activityId,
                            ActivitySnapshot.of(activity, day),
                            caption,
                            Instant.now(clock)));
        } catch (DataIntegrityViolationException lostTheRace) {
            throw new ActivityAlreadyInDiaryException();
        }
    }


    private DiaryEntry requireRoomForAPhoto(Membership member, UUID entryId) {
        writeFence.requireWritable(member);
        DiaryEntry entry = requireMyEntry(member, entryId);
        if (photos.countOf(PhotoSubject.DIARY_ENTRY, entry.id()) >= MAX_PHOTOS_PER_ENTRY) {
            throw new TooManyDiaryPhotosException(MAX_PHOTOS_PER_ENTRY);
        }
        return entry;
    }


    private DiaryEntry requireMyEntry(Membership member, UUID entryId) {
        return entries
                .findByIdAndTravelerId(entryId, member.travelerId())
                .filter(entry -> entry.itineraryId().equals(member.itineraryId()))
                .orElseThrow(DiaryEntryNotFoundException::new);
    }


    private void requireStarted(Membership member) {
        ItineraryState state =
                itineraries
                        .findById(member.itineraryId())
                        .orElseThrow(DiaryEntryNotFoundException::new)
                        .state();
        if (state != ItineraryState.ONGOING && state != ItineraryState.COMPLETED) {
            throw new TripNotStartedException();
        }
    }


    private Activity requireActivityOfTrip(Membership member, UUID activityId) {
        Activity activity =
                activities.findById(activityId).orElseThrow(ActivityNotFoundException::new);
        days.findByIdAndItineraryId(activity.dayId(), member.itineraryId())
                .orElseThrow(ActivityNotFoundException::new);
        return activity;
    }


    private Photo requireDumpPhotoOfTrip(Membership member, UUID photoId) {
        return photos.find(photoId)
                .filter(photo -> photo.subjectKind() == PhotoSubject.ITINERARY_PHOTO_DUMP)
                .filter(photo -> photo.subjectId().equals(member.itineraryId()))
                .orElseThrow(PhotoNotFoundException::new);
    }


    private void emit(Membership member, String event, UUID entryId) {
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named(event)
                                        .with("diaryEntryId", entryId)
                                        .with("itineraryId", member.itineraryId())
                                        .with("travelerId", member.travelerId())
                                        .build()));
    }
}
