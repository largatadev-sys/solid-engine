package com.largata.itinerary;

import com.largata.common.api.Page;
import com.largata.common.authz.AudienceFence;
import com.largata.common.authz.Membership;
import com.largata.common.authz.WriteFence;
import com.largata.itinerary.PhotoDumpExceptions.NotThePhotosUploaderException;
import com.largata.media.MediaExceptions.PhotoNotFoundException;
import com.largata.media.Photo;
import com.largata.media.PhotoService;
import com.largata.media.PhotoSubject;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class PhotoDumpService {

    private static final int DEFAULT_PAGE_SIZE = 30;
    private static final int MAX_PAGE_SIZE = 100;

    private final PhotoService photos;
    private final WriteFence writeFence;
    private final AudienceFence audienceFence;

    PhotoDumpService(PhotoService photos, WriteFence writeFence, AudienceFence audienceFence) {
        this.photos = photos;
        this.writeFence = writeFence;
        this.audienceFence = audienceFence;
    }


    @Transactional
    public Photo add(Membership member, byte[] uploaded) {
        writeFence.requireWritable(member);
        return photos.add(
                PhotoSubject.ITINERARY_PHOTO_DUMP, member.itineraryId(), uploaded, member.travelerId());
    }


    @Transactional(readOnly = true)
    public Page<Photo> list(Membership member, String cursor, Integer requestedLimit) {
        audienceFence.requireInAudience(member);
        return photos.pageOf(
                PhotoSubject.ITINERARY_PHOTO_DUMP, member.itineraryId(), cursor, clamp(requestedLimit));
    }


    @Transactional
    public void remove(Membership member, UUID photoId) {
        Photo photo = photoOfThisPool(member, photoId);
        if (!member.isOwner() && !photo.uploadedBy().equals(member.travelerId())) {
            throw new NotThePhotosUploaderException();
        }
        writeFence.requireWritable(member);
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
