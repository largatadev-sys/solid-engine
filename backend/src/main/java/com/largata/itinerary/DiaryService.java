package com.largata.itinerary;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.api.Cursor;
import com.largata.common.api.Page;
import com.largata.common.authz.InAudience;
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
import com.largata.postcard.api.LegacyEntries;
import com.largata.postcard.exception.ActivityAlreadyPostcardedException;
import com.largata.trip.workspace.WorkspaceService;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.largata.trip.record.TripRepository;
import com.largata.trip.record.Trip;
import com.largata.trip.api.TripLifecycle;
import com.largata.trip.plan.ActivityRepository;
import com.largata.trip.plan.DayRepository;
import com.largata.trip.plan.Activity;
import com.largata.trip.plan.Day;
import com.largata.trip.plan.ActivityNotFoundException;
import com.largata.trip.plan.ActivitySnapshot;


@Service
public class DiaryService {

    public static final int MAX_PHOTOS_PER_ENTRY = 5;

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private static final Logger log = LoggerFactory.getLogger(DiaryService.class);

    private final LegacyEntries entries;
    private final ActivityRepository activities;
    private final DayRepository days;
    private final TripRepository itineraries;
    private final PhotoService photos;
    private final WriteFence writeFence;
    private final WorkspaceService workspaces;
    private final Analytics analytics;

    DiaryService(
            LegacyEntries entries,
            ActivityRepository activities,
            DayRepository days,
            TripRepository itineraries,
            PhotoService photos,
            WriteFence writeFence,
            WorkspaceService workspaces,
            Analytics analytics) {
        this.entries = entries;
        this.activities = activities;
        this.days = days;
        this.itineraries = itineraries;
        this.photos = photos;
        this.writeFence = writeFence;
        this.workspaces = workspaces;
        this.analytics = analytics;
    }


    @Transactional
    public DiaryEntryResponse post(
            Membership member,
            UUID activityId,
            String caption,
            List<UUID> fromDump,
            List<byte[]> devicePhotos) {
        writeFence.requireWritable(member);
        Trip trip = requireStarted(member);

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

        if (entries.alreadyPosted(member.travelerId(), activityId)) {
            throw new ActivityAlreadyInDiaryException();
        }

        LegacyEntries.Entry entry = saveTheFirstPostFor(member, trip, activityId, activity, day, caption);

        List<Photo> stored = new ArrayList<>();
        sources.forEach(
                source ->
                        stored.add(
                                photos.copyTo(
                                        source, PhotoSubject.POSTCARD, entry.id(), member.travelerId())));
        devicePhotos.forEach(
                bytes ->
                        stored.add(
                                photos.add(
                                        PhotoSubject.POSTCARD, entry.id(), bytes, member.travelerId())));

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
        LegacyEntries.Entry entry = requireMyEntry(member, entryId);
        LegacyEntries.Entry saved = entries.recaption(entry.id(), caption);
        emit(member, "diary_entry_edited", entryId);
        return viewOf(saved);
    }


    @Transactional
    public DiaryEntryResponse addDevicePhoto(Membership member, UUID entryId, byte[] uploaded) {
        LegacyEntries.Entry entry = requireRoomForAPhoto(member, entryId);
        photos.add(PhotoSubject.POSTCARD, entry.id(), uploaded, member.travelerId());
        emit(member, "diary_entry_edited", entryId);
        return viewOf(entry);
    }


    @Transactional
    public DiaryEntryResponse addPhotoFromDump(Membership member, UUID entryId, UUID dumpPhotoId) {
        LegacyEntries.Entry entry = requireRoomForAPhoto(member, entryId);
        photos.copyTo(
                requireDumpPhotoOfTrip(member, dumpPhotoId),
                PhotoSubject.POSTCARD,
                entry.id(),
                member.travelerId());
        emit(member, "diary_entry_edited", entryId);
        return viewOf(entry);
    }


    @Transactional
    public DiaryEntryResponse removePhoto(Membership member, UUID entryId, UUID photoId) {
        writeFence.requireWritable(member);
        LegacyEntries.Entry entry = requireMyEntry(member, entryId);

        Photo photo =
                photos.find(photoId)
                        .filter(candidate -> candidate.subjectKind() == PhotoSubject.POSTCARD)
                        .filter(candidate -> candidate.subjectId().equals(entry.id()))
                        .orElseThrow(PhotoNotFoundException::new);

        if (photos.countOf(PhotoSubject.POSTCARD, entry.id()) <= 1) {
            throw new DiaryEntryNeedsAPhotoException();
        }

        photos.delete(photo.id());
        emit(member, "diary_entry_edited", entryId);
        return viewOf(entry);
    }


    @Transactional
    public void delete(Membership member, UUID entryId) {
        writeFence.requireWritable(member);
        LegacyEntries.Entry entry = requireMyEntry(member, entryId);

        photos.allOf(PhotoSubject.POSTCARD, entry.id()).forEach(photo -> photos.delete(photo.id()));
        entries.delete(entry.id());

        log.info("Diary entry deleted: entryId={}", entryId);
        emit(member, "diary_entry_deleted", entryId);
    }


    @Transactional(readOnly = true)
    public Page<DiaryEntryResponse> mine(InAudience audience, String cursor, Integer requestedLimit) {
        Membership member = audience.member();
        int limit = clamp(requestedLimit);
        List<LegacyEntries.Entry> found =
                entries.pageOfMine(
                        member.travelerId(),
                        member.itineraryId(),
                        cursor == null ? null : Cursor.decode(cursor),
                        limit + 1);

        if (found.size() <= limit) {
            return Page.exhausted(withPhotos(found));
        }
        List<LegacyEntries.Entry> page = found.subList(0, limit);
        return Page.of(withPhotos(page), Cursor.encode(page.getLast().id()));
    }


    @Transactional(readOnly = true)
    public DiaryEntryResponse mineById(InAudience audience, UUID entryId) {
        return viewOf(requireMyEntry(audience.member(), entryId));
    }


    @Transactional(readOnly = true)
    public Page<DiaryTripResponse> myTrips(UUID travelerId, String cursor, Integer requestedLimit) {
        UUID after = cursor == null ? null : Cursor.decode(cursor);
        List<UUID> openable = workspaces.tripIdsInSightOf(travelerId);
        if (openable.isEmpty()) {
            return Page.exhausted(List.of());
        }
        int limit = clamp(requestedLimit);
        List<LegacyEntries.TripRoll> found = entries.tripsOf(travelerId, openable, after, limit + 1);

        boolean more = found.size() > limit;
        List<LegacyEntries.TripRoll> rows = more ? found.subList(0, limit) : found;
        Map<UUID, Long> dayCounts = dayCountsFor(rows);
        List<DiaryTripResponse> page = rows.stream().map(row -> tripViewOf(row, dayCounts)).toList();

        return more ? Page.of(page, Cursor.encode(rows.getLast().latestEntryId())) : Page.exhausted(page);
    }


    private Map<UUID, Long> dayCountsFor(List<LegacyEntries.TripRoll> rows) {
        if (rows.isEmpty()) {
            return Map.of();
        }
        List<UUID> itineraryIds = rows.stream().map(LegacyEntries.TripRoll::tripId).toList();
        return days.countByItineraryIdIn(itineraryIds).stream()
                .collect(
                        Collectors.toMap(
                                DayRepository.DayCountRow::getItineraryId,
                                DayRepository.DayCountRow::getDayCount));
    }


    private DiaryTripResponse tripViewOf(LegacyEntries.TripRoll row, Map<UUID, Long> dayCounts) {
        Trip trip = itineraries.findById(row.tripId()).orElse(null);
        return new DiaryTripResponse(
                row.tripId(),
                trip == null ? null : trip.title(),
                row.entryCount(),
                trip == null ? null : trip.destination(),
                dayCounts.getOrDefault(row.tripId(), 0L).intValue(),
                trip == null ? null : trip.coverImageUrl());
    }


    private DiaryEntryResponse viewOf(LegacyEntries.Entry entry) {
        return viewOf(entry, photos.allOf(PhotoSubject.POSTCARD, entry.id()));
    }


    private List<DiaryEntryResponse> withPhotos(List<LegacyEntries.Entry> ofEntries) {
        Map<UUID, List<Photo>> byEntry =
                photos.allOfEach(
                        PhotoSubject.POSTCARD,
                        ofEntries.stream().map(LegacyEntries.Entry::id).toList());
        return ofEntries.stream()
                .map(entry -> viewOf(entry, byEntry.getOrDefault(entry.id(), List.of())))
                .toList();
    }


    static DiaryEntryResponse viewOf(LegacyEntries.Entry entry, List<Photo> entryPhotos) {
        return new DiaryEntryResponse(
                entry.id(),
                entry.tripId(),
                entry.activityId(),
                entry.activityTitle(),
                entry.dayLabel(),
                entry.timeOfDay(),
                entry.place(),
                entry.caption(),
                entryPhotos.stream().map(DiaryPhotoResponse::of).toList(),
                entry.sharedAt(),
                entry.createdAt(),
                entry.updatedAt());
    }


    private static int clamp(Integer requestedLimit) {
        if (requestedLimit == null || requestedLimit < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requestedLimit, MAX_PAGE_SIZE);
    }


    private LegacyEntries.Entry saveTheFirstPostFor(
            Membership member,
            Trip trip,
            UUID activityId,
            Activity activity,
            Day day,
            String caption) {
        ActivitySnapshot snapshot = ActivitySnapshot.of(activity, day);
        try {
            return entries.post(
                    member.travelerId(),
                    member.itineraryId(),
                    activityId,
                    snapshot.activityTitle(),
                    snapshot.dayLabel(),
                    snapshot.timeOfDay(),
                    snapshot.place(),
                    day.id(),
                    day.ordinal(),
                    day.title(),
                    trip.title(),
                    trip.destination(),
                    trip.startDate(),
                    trip.endDate(),
                    caption);
        } catch (ActivityAlreadyPostcardedException lostTheRace) {
            throw new ActivityAlreadyInDiaryException();
        }
    }


    private LegacyEntries.Entry requireRoomForAPhoto(Membership member, UUID entryId) {
        writeFence.requireWritable(member);
        LegacyEntries.Entry entry = requireMyEntry(member, entryId);
        if (photos.countOf(PhotoSubject.POSTCARD, entry.id()) >= MAX_PHOTOS_PER_ENTRY) {
            throw new TooManyDiaryPhotosException(MAX_PHOTOS_PER_ENTRY);
        }
        return entry;
    }


    private LegacyEntries.Entry requireMyEntry(Membership member, UUID entryId) {
        return entries
                .mine(entryId, member.travelerId(), member.itineraryId())
                .orElseThrow(DiaryEntryNotFoundException::new);
    }


    private Trip requireStarted(Membership member) {
        Trip trip =
                itineraries.findById(member.itineraryId()).orElseThrow(DiaryEntryNotFoundException::new);
        if (trip.state() != TripLifecycle.ONGOING && trip.state() != TripLifecycle.COMPLETED) {
            throw new TripNotStartedException();
        }
        return trip;
    }


    private Activity requireActivityOfTrip(Membership member, UUID activityId) {
        if (activityId == null) {
            throw new ActivityNotFoundException();
        }
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
