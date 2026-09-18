package com.largata.trip.api;

import com.largata.trip.exception.ItineraryNotFoundException;
import com.largata.trip.exception.ItineraryPublishedException;
import com.largata.trip.exception.MembershipFrozenException;
import com.largata.trip.exception.TripArchivedException;
import java.util.UUID;
import org.springframework.stereotype.Component;


@Component
public class WriteFence {

    private final ArchiveState archive;
    private final PublicationState publication;

    public WriteFence(ArchiveState archive, PublicationState publication) {
        this.archive = archive;
        this.publication = publication;
    }


    public void requireWritable(Membership member) {
        if (!archive.isArchived(member.itineraryId())) {
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


    public void requireMembershipMutable(Membership member) {
        requireWritable(member);
        requireMembershipUnfrozen(member.itineraryId());
    }


    public void requireMembershipUnfrozen(UUID itineraryId) {
        if (publication.isPublished(itineraryId)) {
            throw new MembershipFrozenException();
        }
    }
}
