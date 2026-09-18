package com.largata.trip.dump;

import com.largata.common.api.Page;
import com.largata.trip.api.Membership;
import com.largata.trip.api.TripFence;
import com.largata.media.MediaExceptions.PhotoNotFoundException;
import com.largata.media.Photo;
import com.largata.media.PhotoService;
import com.largata.media.PhotoSubject;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.largata.trip.dump.PhotoDumpExceptions.NotThePhotosUploaderException;


@Service
public class PhotoDumpService {

    private static final int DEFAULT_PAGE_SIZE = 30;
    private static final int MAX_PAGE_SIZE = 100;

    private final PhotoService photos;
    private final TripFence fence;

    PhotoDumpService(PhotoService photos, TripFence fence) {
        this.photos = photos;
        this.fence = fence;
    }


    @Transactional
    public Photo add(TripFence.Writable<?> writable, byte[] uploaded) {
        Membership member = writable.member();
        return photos.add(
                PhotoSubject.ITINERARY_PHOTO_DUMP, member.itineraryId(), uploaded, member.travelerId());
    }


    @Transactional(readOnly = true)
    public Page<Photo> list(TripFence.InAudience<?> audience, String cursor, Integer requestedLimit) {
        return photos.pageOf(
                PhotoSubject.ITINERARY_PHOTO_DUMP,
                audience.member().itineraryId(),
                cursor,
                clamp(requestedLimit));
    }


    @Transactional
    public void remove(TripFence.Writable<?> writable, UUID photoId) {
        Membership member = writable.member();
        Photo photo = photoOfThisPool(member, photoId);
        if (!member.isOwner() && !photo.uploadedBy().equals(member.travelerId())) {
            throw new NotThePhotosUploaderException();
        }
        photos.delete(photo.id());
    }


    private Photo photoOfThisPool(Membership member, UUID photoId) {
        return photos.find(photoId)
                .filter(photo -> photo.subjectKind() == PhotoSubject.ITINERARY_PHOTO_DUMP)
                .filter(photo -> photo.subjectId().equals(member.itineraryId()))
                .orElseThrow(PhotoNotFoundException::new);
    }


    private static int clamp(Integer requestedLimit) {
        if (requestedLimit == null || requestedLimit < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requestedLimit, MAX_PAGE_SIZE);
    }
}
