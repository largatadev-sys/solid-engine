package com.largata.publication.service;

import com.largata.publication.repository.ItineraryObjectRepository;
import com.largata.trip.api.ForkApi;
import com.largata.trip.api.MembershipApi;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


@Component
class ItinerarySourceVisibility implements ForkApi.SourceVisibility {

    private final ItineraryObjectRepository objects;
    private final MembershipApi workspaces;

    ItinerarySourceVisibility(ItineraryObjectRepository objects, MembershipApi workspaces) {
        this.objects = objects;
        this.workspaces = workspaces;
    }


    @Override
    @Transactional(readOnly = true)
    public boolean stillLive(UUID sourceId) {
        return objects.findById(sourceId)
                .filter(object -> !object.isRetired())
                .filter(object -> !workspaces.isArchived(object.tripId()))
                .isPresent();
    }


    @Override
    @Transactional(readOnly = true)
    public java.util.Optional<UUID> ownerOf(UUID sourceId) {
        return objects.findById(sourceId).map(com.largata.publication.entity.ItineraryObject::ownerId);
    }
}
