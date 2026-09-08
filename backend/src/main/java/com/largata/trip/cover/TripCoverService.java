package com.largata.trip.cover;

import com.largata.common.authz.Membership;
import com.largata.media.MediaUrls;
import com.largata.media.Photo;
import com.largata.media.PhotoService;
import com.largata.media.PhotoSubject;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.largata.trip.history.ActivityHistoryService;
import com.largata.trip.trip.service.ShareCardVersionService;
import com.largata.trip.trip.entity.Trip;
import com.largata.trip.history.HistoryAct;
import com.largata.trip.editing.entity.LeaseSubject;
import com.largata.trip.trip.repository.TripRepository;
import com.largata.trip.editing.service.EditLeaseService;


@Service
public class TripCoverService {

    private static final Logger log = LoggerFactory.getLogger(TripCoverService.class);

    private final TripRepository trips;
    private final EditLeaseService editLease;
    private final ActivityHistoryService history;
    private final PhotoService photos;
    private final ShareCardVersionService shareCardVersions;

    TripCoverService(
            TripRepository trips,
            EditLeaseService editLease,
            ActivityHistoryService history,
            PhotoService photos,
            ShareCardVersionService shareCardVersions) {
        this.trips = trips;
        this.editLease = editLease;
        this.history = history;
        this.photos = photos;
        this.shareCardVersions = shareCardVersions;
    }


    @Transactional
    public Trip replaceCover(Membership member, byte[] uploaded) {
        Trip itinerary = editableHeaderOf(member);
        Photo stored =
                photos.replaceSingle(
                        PhotoSubject.ITINERARY_COVER, member.itineraryId(), uploaded, member.travelerId());
        itinerary.showCover(MediaUrls.of(stored), member.travelerId(), Instant.now());
        trips.save(itinerary);
        history.record(member, HistoryAct.HEADER_EDITED, LeaseSubject.header(member.itineraryId()));
        log.info(
                "Trip cover set: id={} photoId={} editor={}",
                member.itineraryId(),
                stored.id(),
                member.travelerId());
        return bumpedAndReloaded(member);
    }


    @Transactional
    public Trip removeCover(Membership member) {
        Trip itinerary = editableHeaderOf(member);
        boolean hadCover = itinerary.coverImageUrl() != null;
        photos.deleteSingle(PhotoSubject.ITINERARY_COVER, member.itineraryId());
        itinerary.showCover(null, member.travelerId(), Instant.now());
        trips.save(itinerary);
        history.record(member, HistoryAct.HEADER_EDITED, LeaseSubject.header(member.itineraryId()));
        log.info("Trip cover removed: id={} editor={}", member.itineraryId(), member.travelerId());
        return hadCover ? bumpedAndReloaded(member) : itinerary;
    }


    private Trip bumpedAndReloaded(Membership member) {
        return shareCardVersions.bumpAndReload(member.itineraryId());
    }


    private Trip editableHeaderOf(Membership member) {
        editLease.requireHeldBy(member, LeaseSubject.header(member.itineraryId()));
        return trips
                .findById(member.itineraryId())
                .orElseThrow(() -> new IllegalStateException(
                        "The guard authorized a membership for an itinerary that does not exist"));
    }
}
