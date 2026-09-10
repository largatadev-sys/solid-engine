package com.largata.join.card.service;

import com.largata.join.join.service.JoinService;
import com.largata.join.join.service.JoinTeaser;
import com.largata.join.join.service.ViewerJoinState;
import com.largata.media.web.PhotoBytes;
import com.largata.trip.api.TripApi;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JoinCardService {

    private final JoinService join;
    private final PhotoBytes covers;
    private final TripApi trips;

    JoinCardService(JoinService join, PhotoBytes covers, TripApi trips) {
        this.join = join;
        this.covers = covers;
        this.trips = trips;
    }


    @Transactional(readOnly = true)
    public JoinCard cardFor(String token) {
        JoinTeaser teaser = join.cardTeaserFor(token);
        long version = trips.shareCardVersionOf(teaser.itineraryId());
        if (teaser.viewerState() == ViewerJoinState.DEAD) {
            return JoinCard.dead(version);
        }
        byte[] cover =
                teaser.coverUrl() == null
                        ? null
                        : covers.displayBytesOfItineraryCover(teaser.itineraryId()).orElse(null);
        String metaLine =
                TripMetaLine.of(teaser.destination(), teaser.startDate(), teaser.endDate());
        return JoinCard.live(
                teaser.title(),
                metaLine,
                version,
                CardSubject.invitation(teaser.title(), teaser.destination(), metaLine, cover));
    }
}
