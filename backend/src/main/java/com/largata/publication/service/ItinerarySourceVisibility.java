package com.largata.publication.service;

import com.largata.publication.repository.ItineraryObjectRepository;
import com.largata.trip.api.ForkApi;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


@Component
class ItinerarySourceVisibility implements ForkApi.SourceVisibility {

    private final ItineraryObjectRepository objects;

    ItinerarySourceVisibility(ItineraryObjectRepository objects) {
        this.objects = objects;
    }


    @Override
    @Transactional(readOnly = true)
    public boolean stillLive(UUID sourceId) {
        return objects.findById(sourceId).filter(object -> !object.isRetired()).isPresent();
    }
}
