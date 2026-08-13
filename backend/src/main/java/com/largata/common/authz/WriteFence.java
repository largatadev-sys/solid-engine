package com.largata.common.authz;

import org.springframework.stereotype.Component;


@Component
public class WriteFence {

    private final TripWritability writability;
    private final PublicationState publication;

    public WriteFence(TripWritability writability, PublicationState publication) {
        this.writability = writability;
        this.publication = publication;
    }


    public void requireWritable(Membership member) {
        if (!writability.isFrozen(member.itineraryId())) {
            return;
        }
        if (member.isOwner()) {
            throw new TripArchivedException();
        }
        throw new ItineraryNotFoundException();
    }


    public void requireEditable(Membership member) {
        requireWritable(member);
        if (publication.isPublished(member.itineraryId())) {
            throw new ItineraryPublishedException();
        }
    }
}
