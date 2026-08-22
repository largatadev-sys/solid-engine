package com.largata.itinerary;

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


@Service
public class ItineraryCoverService {

    private static final Logger log = LoggerFactory.getLogger(ItineraryCoverService.class);

    private final ItineraryRepository itineraries;
    private final EditLeaseService editLease;
    private final ActivityHistoryService history;
    private final PhotoService photos;
    private final ShareCardVersionService shareCardVersions;

    ItineraryCoverService(
            ItineraryRepository itineraries,
            EditLeaseService editLease,
            ActivityHistoryService history,
            PhotoService photos,
            ShareCardVersionService shareCardVersions) {
        this.itineraries = itineraries;
        this.editLease = editLease;
        this.history = history;
        this.photos = photos;
        this.shareCardVersions = shareCardVersions;
    }


    @Transactional
    public Itinerary replaceCover(Membership member, byte[] uploaded) {
        Itinerary itinerary = editableHeaderOf(member);
        Photo stored =
                photos.replaceSingle(
                        PhotoSubject.ITINERARY_COVER, member.itineraryId(), uploaded, member.travelerId());
        itinerary.showCover(MediaUrls.of(stored), member.travelerId(), Instant.now());
        itineraries.save(itinerary);
        history.record(member, HistoryAct.HEADER_EDITED, LeaseSubject.header(member.itineraryId()));
        log.info(
                "Itinerary cover set: id={} photoId={} editor={}",
                member.itineraryId(),
                stored.id(),
                member.travelerId());
        return bumpedAndReloaded(member);
    }


    @Transactional
    public Itinerary removeCover(Membership member) {
        Itinerary itinerary = editableHeaderOf(member);
        if (itinerary.coverImageUrl() == null) {
            return itinerary;
        }
        photos.deleteSingle(PhotoSubject.ITINERARY_COVER, member.itineraryId());
        itinerary.showCover(null, member.travelerId(), Instant.now());
        itineraries.save(itinerary);
        history.record(member, HistoryAct.HEADER_EDITED, LeaseSubject.header(member.itineraryId()));
        log.info("Itinerary cover removed: id={} editor={}", member.itineraryId(), member.travelerId());
        return bumpedAndReloaded(member);
    }


    private Itinerary bumpedAndReloaded(Membership member) {
        shareCardVersions.bump(member.itineraryId());
        return itineraries
                .findById(member.itineraryId())
                .orElseThrow(() -> new IllegalStateException(
                        "The cover was written to an itinerary that no longer exists"));
    }


    private Itinerary editableHeaderOf(Membership member) {
        editLease.requireHeldBy(member, LeaseSubject.header(member.itineraryId()));
        return itineraries
                .findById(member.itineraryId())
                .orElseThrow(() -> new IllegalStateException(
                        "The guard authorized a membership for an itinerary that does not exist"));
    }
}
