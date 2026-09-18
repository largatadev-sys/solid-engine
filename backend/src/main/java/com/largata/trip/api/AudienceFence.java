package com.largata.trip.api;

import com.largata.trip.exception.ItineraryNotFoundException;
import org.springframework.stereotype.Component;


@Component
public class AudienceFence {

    private final ArchiveState archive;

    public AudienceFence(ArchiveState archive) {
        this.archive = archive;
    }


    public InAudience requireInAudience(Membership member) {
        if (!member.isOwner() && archive.isArchived(member.itineraryId())) {
            throw new ItineraryNotFoundException();
        }
        return new InAudience(member);
    }
}
