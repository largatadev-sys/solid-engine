package com.largata.join;

import com.largata.itinerary.ShareCardVersionService;
import com.largata.join.card.CardSubject;
import com.largata.join.card.TripMetaLine;
import com.largata.media.web.PhotoBytes;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class JoinCardService {

    private final JoinService join;
    private final PhotoBytes covers;
    private final ShareCardVersionService shareCardVersions;

    JoinCardService(JoinService join, PhotoBytes covers, ShareCardVersionService shareCardVersions) {
        this.join = join;
        this.covers = covers;
        this.shareCardVersions = shareCardVersions;
    }


    @Transactional(readOnly = true)
    public JoinCard cardFor(String token) {
        JoinTeaser teaser = join.cardTeaserFor(token);
        long version = shareCardVersions.currentVersion(teaser.itineraryId());
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
