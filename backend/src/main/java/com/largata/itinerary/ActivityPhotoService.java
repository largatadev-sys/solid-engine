package com.largata.itinerary;

import com.largata.common.authz.Membership;
import com.largata.media.MediaExceptions.PhotoNotFoundException;
import com.largata.media.Photo;
import com.largata.media.PhotoService;
import com.largata.media.PhotoSubject;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class ActivityPhotoService {

    public static final int MAX_PHOTOS_PER_ACTIVITY = 5;

    private static final Logger log = LoggerFactory.getLogger(ActivityPhotoService.class);

    private final ActivityRepository activities;
    private final DayRepository days;
    private final EditLeaseService editLease;
    private final ActivityHistoryService history;
    private final PhotoService photos;

    ActivityPhotoService(
            ActivityRepository activities,
            DayRepository days,
            EditLeaseService editLease,
            ActivityHistoryService history,
            PhotoService photos) {
        this.activities = activities;
        this.days = days;
        this.editLease = editLease;
        this.history = history;
        this.photos = photos;
    }


    @Transactional
    public Photo add(Membership member, UUID activityId, byte[] uploaded) {
        requireActivityOfTrip(member, activityId);
        editLease.requireHeldBy(member, LeaseSubject.activity(activityId));

        if (photos.countOf(PhotoSubject.ACTIVITY, activityId) >= MAX_PHOTOS_PER_ACTIVITY) {
            throw new TooManyActivityPhotosException(MAX_PHOTOS_PER_ACTIVITY);
        }

        Photo stored =
                photos.add(PhotoSubject.ACTIVITY, activityId, uploaded, member.travelerId());
        history.record(member, HistoryAct.ACTIVITY_EDITED, LeaseSubject.activity(activityId));
        log.info("Activity photo added: activityId={} photoId={}", activityId, stored.id());
        return stored;
    }


    @Transactional
    public void remove(Membership member, UUID activityId, UUID photoId) {
        requireActivityOfTrip(member, activityId);
        editLease.requireHeldBy(member, LeaseSubject.activity(activityId));

        Photo photo = photos.find(photoId).orElseThrow(PhotoNotFoundException::new);
        if (photo.subjectKind() != PhotoSubject.ACTIVITY || !photo.subjectId().equals(activityId)) {
            throw new PhotoNotFoundException();
        }

        photos.delete(photoId);
        history.record(member, HistoryAct.ACTIVITY_EDITED, LeaseSubject.activity(activityId));
        log.info("Activity photo removed: activityId={} photoId={}", activityId, photoId);
    }


    @Transactional(readOnly = true)
    public List<Photo> of(UUID activityId) {
        return photos.allOf(PhotoSubject.ACTIVITY, activityId);
    }


    @Transactional(readOnly = true)
    public Map<UUID, List<Photo>> ofEach(List<UUID> activityIds) {
        return photos.allOfEach(PhotoSubject.ACTIVITY, activityIds);
    }


    private void requireActivityOfTrip(Membership member, UUID activityId) {
        Activity activity = activities.findById(activityId).orElseThrow(ActivityNotFoundException::new);
        days.findByIdAndItineraryId(activity.dayId(), member.itineraryId())
                .orElseThrow(ActivityNotFoundException::new);
    }
}
